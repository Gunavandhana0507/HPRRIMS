package com.hprrims.service;

import com.hprrims.dto.AdmissionDtos.*;
import com.hprrims.dto.PageResponse;
import com.hprrims.dto.PredictionDtos.PredictionOutcome;
import com.hprrims.entity.*;
import com.hprrims.exception.ApiException;
import com.hprrims.repository.*;
import com.hprrims.security.CurrentUser;
import com.hprrims.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AdmissionService {

    private static final int FUTURE_TOLERANCE_MINUTES = 5;

    private final AdmissionRepository admissionRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final ReadmissionPredictionRepository predictionRepository;
    private final IcuRequestRepository icuRequestRepository;
    private final ReadmissionDetectionService detectionService;
    private final PredictionService predictionService;
    private final SettingsService settingsService;
    private final AuditService auditService;
    private final DtoMapper mapper;

    @Transactional(readOnly = true)
    public PageResponse<AdmissionResponse> search(AdmissionStatus status, LocalDate from, LocalDate to, String patientQ,
                                                  Long doctorId, Boolean readmission, int page, int size) {
        if (from != null && to != null && to.isBefore(from)) {
            throw ApiException.badRequest("INVALID_RANGE", "The end date must be on or after the start date.");
        }
        var result = admissionRepository.search(status, from == null ? null : from.atStartOfDay(),
                to == null ? null : to.plusDays(1).atStartOfDay(), Text.like(patientQ), doctorId, readmission,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "admittedAt")));
        return PageResponse.of(result, mapper::admission);
    }

    @Transactional(readOnly = true)
    public AdmissionResponse get(Long id) {
        Admission a = load(id);
        var latest = predictionRepository.findFirstByAdmissionIdOrderByCreatedAtDesc(id).map(mapper::prediction).orElse(null);
        var icu = icuRequestRepository.findByAdmissionIdInOrderByCreatedAtDesc(List.of(id)).stream().map(mapper::icuRequest).toList();
        return mapper.admission(a, latest, icu);
    }

    @Transactional
    public AdmissionResponse create(CreateAdmissionRequest req) {
        Patient patient = patientRepository.findByIdForUpdate(req.patientId()).orElseThrow(() -> ApiException.notFound("Patient"));
        if (admissionRepository.existsByPatientIdAndStatus(patient.getId(), AdmissionStatus.ADMITTED)) {
            throw ApiException.conflict("ACTIVE_ADMISSION_EXISTS",
                    "This patient already has an active admission. Discharge it before creating a new one.");
        }
        notInFuture(req.admittedAt(), "Admission date");
        if (req.admittedAt().toLocalDate().isBefore(patient.getDateOfBirth())) {
            throw ApiException.badRequest("INVALID_ADMISSION_DATE", "Admission date cannot be before the date of birth.");
        }
        User doctor = activeDoctor(req.doctorId());
        int window = settingsService.readmissionWindowDays();
        var check = detectionService.evaluate(patient.getId(), req.admittedAt(), window);
        Admission a = new Admission();
        a.setPatient(patient);
        a.setDoctor(doctor);
        a.setAdmittedAt(req.admittedAt());
        a.setReason(req.reason().trim());
        a.setWard(Text.blankToNull(req.ward()));
        a.setStatus(AdmissionStatus.ADMITTED);
        a.setReadmission(check.readmission());
        a.setPreviousAdmission(check.previousAdmission());
        a.setDaysSincePreviousDischarge(check.daysSinceDischarge());
        a.setReadmissionWindowDays(window);
        a.setCreatedBy(userRepository.getReferenceById(CurrentUser.get().id()));
        admissionRepository.saveAndFlush(a);
        auditService.log("ADMISSION_CREATED", "ADMISSION", a.getId(), patient.getPatientCode() + " admitted under "
                + doctor.getFullName() + (check.readmission()
                ? "; readmission " + check.daysSinceDischarge() + " days after discharge (window " + window + ")"
                : "; not a readmission"));
        return get(a.getId());
    }

    @Transactional
    public AdmissionResponse reassignDoctor(Long id, ReassignDoctorRequest req) {
        Admission a = load(id);
        if (!a.isActive()) {
            throw ApiException.badRequest("ADMISSION_NOT_ACTIVE", "Doctors can only be reassigned on active admissions.");
        }
        User doctor = activeDoctor(req.doctorId());
        String previous = a.getDoctor().getFullName();
        a.setDoctor(doctor);
        auditService.log("ADMISSION_DOCTOR_CHANGED", "ADMISSION", id, previous + " -> " + doctor.getFullName());
        return get(id);
    }

    @Transactional
    public DischargeResponse discharge(Long id, DischargeRequest req) {
        UserPrincipal me = CurrentUser.get();
        Admission a = load(id);
        if (a.getStatus() != AdmissionStatus.ADMITTED) {
            throw ApiException.conflict("ALREADY_DISCHARGED", "This admission has already been discharged.");
        }
        validateDischargeDate(a, req.dischargedAt());
        a.setStatus(AdmissionStatus.DISCHARGED);
        a.setDischargedAt(req.dischargedAt());
        a.setDischargeSummary(req.dischargeSummary().trim());
        a.setFollowUpNotes(Text.blankToNull(req.followUpNotes()));
        a.setDischargeRecordedAt(LocalDateTime.now());
        a.setDischargedBy(userRepository.getReferenceById(me.id()));
        closeIcuRequests(a);
        admissionRepository.saveAndFlush(a);
        auditService.log("ADMISSION_DISCHARGED", "ADMISSION", id, a.getPatient().getPatientCode() + " discharged");
        PredictionOutcome outcome = predictionService.predict(id, PredictionTrigger.DISCHARGE);
        return new DischargeResponse(get(id), outcome);
    }

    @Transactional
    public AdmissionResponse updateDischarge(Long id, DischargeUpdateRequest req) {
        UserPrincipal me = CurrentUser.get();
        Admission a = load(id);
        if (a.getStatus() != AdmissionStatus.DISCHARGED) {
            throw ApiException.badRequest("NOT_DISCHARGED", "Only discharged admissions have discharge details to edit.");
        }
        String reason = Text.blankToNull(req.reason());
        if (me.role() == Role.STAFF) {
            LocalDateTime until = a.getDischargeRecordedAt().plusHours(settingsService.staffDischargeEditHours());
            if (LocalDateTime.now().isAfter(until)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "EDIT_WINDOW_CLOSED", "Staff can edit discharge details for "
                        + settingsService.staffDischargeEditHours() + " hours after discharge. Ask an admin to make an audited correction.");
            }
        } else if (reason == null) {
            throw ApiException.badRequest("REASON_REQUIRED", "Admin corrections require a reason for the audit log.");
        }
        validateDischargeDate(a, req.dischargedAt());
        List<Admission> later = admissionRepository.findByPatientIdOrderByAdmittedAtAsc(a.getPatient().getId()).stream()
                .filter(x -> x.getAdmittedAt().isAfter(a.getAdmittedAt())).toList();
        if (!later.isEmpty() && req.dischargedAt().isAfter(later.get(0).getAdmittedAt())) {
            throw ApiException.badRequest("OVERLAPS_NEXT_ADMISSION", "The discharge date cannot be after the patient's next admission.");
        }
        boolean dateChanged = !req.dischargedAt().equals(a.getDischargedAt());
        a.setDischargedAt(req.dischargedAt());
        a.setDischargeSummary(req.dischargeSummary().trim());
        a.setFollowUpNotes(Text.blankToNull(req.followUpNotes()));
        if (dateChanged) {
            later.stream().filter(n -> n.getPreviousAdmission() != null && Objects.equals(n.getPreviousAdmission().getId(), id))
                    .forEach(n -> {
                        var check = ReadmissionDetectionService.evaluate(a, n.getAdmittedAt(), n.getReadmissionWindowDays());
                        n.setReadmission(check.readmission());
                        n.setDaysSincePreviousDischarge(check.daysSinceDischarge());
                    });
        }
        auditService.log(me.role() == Role.ADMIN ? "DISCHARGE_CORRECTED" : "DISCHARGE_UPDATED", "ADMISSION", id,
                dateChanged ? "Discharge details and date updated" : "Discharge details updated", reason);
        return get(id);
    }

    @Transactional
    public PredictionOutcome requestPrediction(Long id, boolean retry) {
        load(id);
        return predictionService.predict(id, retry ? PredictionTrigger.RETRY : PredictionTrigger.MANUAL);
    }

    private void closeIcuRequests(Admission a) {
        LocalDateTime now = LocalDateTime.now();
        icuRequestRepository.findByAdmissionIdAndStatusIn(a.getId(),
                List.of(IcuRequestStatus.PENDING, IcuRequestStatus.ALLOCATED)).forEach(r -> {
            if (r.getStatus() == IcuRequestStatus.ALLOCATED) {
                r.setStatus(IcuRequestStatus.RELEASED);
                r.setReleasedAt(now);
                if (r.getBed() != null) {
                    r.getBed().setStatus(IcuBedStatus.AVAILABLE);
                }
            } else {
                r.setStatus(IcuRequestStatus.CANCELLED);
                r.setDecidedAt(now);
                r.setDecisionNotes("Cancelled automatically at discharge");
            }
            auditService.log("ICU_REQUEST_CLOSED", "ICU_REQUEST", r.getId(), "Closed at discharge: " + r.getStatus());
        });
    }

    private void validateDischargeDate(Admission a, LocalDateTime dischargedAt) {
        if (dischargedAt.isBefore(a.getAdmittedAt())) {
            throw ApiException.badRequest("DISCHARGE_BEFORE_ADMISSION", "Discharge date cannot be before the admission date.");
        }
        notInFuture(dischargedAt, "Discharge date");
    }

    private static void notInFuture(LocalDateTime t, String label) {
        if (t.isAfter(LocalDateTime.now().plusMinutes(FUTURE_TOLERANCE_MINUTES))) {
            throw ApiException.badRequest("DATE_IN_FUTURE", label + " cannot be in the future.");
        }
    }

    private Admission load(Long id) {
        return admissionRepository.findDetailedById(id).orElseThrow(() -> ApiException.notFound("Admission"));
    }

    private User activeDoctor(Long doctorId) {
        User d = userRepository.findById(doctorId).orElseThrow(() -> ApiException.notFound("Doctor"));
        if (d.getRole() != Role.DOCTOR || !d.isActive()) {
            throw ApiException.badRequest("INVALID_DOCTOR", "Select an active doctor.");
        }
        return d;
    }
}
