package com.hprrims.service;

import com.hprrims.dto.IcuDtos.IcuRequestResponse;
import com.hprrims.dto.PageResponse;
import com.hprrims.dto.PatientDtos.*;
import com.hprrims.dto.PredictionDtos.PredictionResponse;
import com.hprrims.entity.*;
import com.hprrims.exception.ApiException;
import com.hprrims.repository.*;
import com.hprrims.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;
    private final AdmissionRepository admissionRepository;
    private final UserRepository userRepository;
    private final MedicalRecordRepository recordRepository;
    private final ReadmissionPredictionRepository predictionRepository;
    private final IcuRequestRepository icuRequestRepository;
    private final AuditService auditService;
    private final DtoMapper mapper;

    @Transactional(readOnly = true)
    public PageResponse<PatientResponse> search(String q, Gender gender, Integer minAge, Integer maxAge, int page, int size) {
        LocalDate today = LocalDate.now();
        LocalDate dobTo = minAge == null ? null : today.minusYears(minAge);
        LocalDate dobFrom = maxAge == null ? null : today.minusYears(maxAge + 1L).plusDays(1);
        var result = patientRepository.search(Text.like(q), gender, dobFrom, dobTo,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<Long> ids = result.getContent().stream().map(Patient::getId).toList();
        Map<Long, Admission> active = ids.isEmpty() ? Map.of() : admissionRepository
                .findByStatusAndPatientIdIn(AdmissionStatus.ADMITTED, ids).stream()
                .collect(Collectors.toMap(a -> a.getPatient().getId(), Function.identity(), (a, b) -> a));
        return PageResponse.ofMapped(result, result.getContent().stream()
                .map(p -> mapper.patient(p, active.get(p.getId()))).toList());
    }

    @Transactional
    public PatientResponse create(PatientRequest req) {
        validateDob(req.dateOfBirth());
        Patient p = new Patient();
        apply(p, req);
        p.setPatientCode("TMP-" + UUID.randomUUID().toString().substring(0, 12));
        p.setCreatedBy(userRepository.getReferenceById(CurrentUser.get().id()));
        patientRepository.saveAndFlush(p);
        p.setPatientCode(String.format("PAT-%06d", p.getId()));
        auditService.log("PATIENT_REGISTERED", "PATIENT", p.getPatientCode(), "Registered " + p.getFullName());
        return mapper.patient(p, null);
    }

    @Transactional
    public PatientResponse update(Long id, PatientRequest req) {
        Patient p = patientRepository.findById(id).orElseThrow(() -> ApiException.notFound("Patient"));
        validateDob(req.dateOfBirth());
        boolean admin = CurrentUser.get().role() == Role.ADMIN;
        String reason = Text.blankToNull(req.correctionReason());
        if (admin && reason == null) {
            throw ApiException.badRequest("REASON_REQUIRED", "Admin corrections require a reason for the audit log.");
        }
        List<String> changed = new ArrayList<>();
        if (!Objects.equals(p.getFullName(), req.fullName().trim())) changed.add("fullName");
        if (!Objects.equals(p.getDateOfBirth(), req.dateOfBirth())) changed.add("dateOfBirth");
        if (p.getGender() != req.gender()) changed.add("gender");
        if (!Objects.equals(p.getContactNumber(), req.contactNumber().trim())) changed.add("contactNumber");
        if (!Objects.equals(p.getEmail(), Text.blankToNull(req.email()))) changed.add("email");
        if (!Objects.equals(p.getAddress(), Text.blankToNull(req.address()))) changed.add("address");
        if (!Objects.equals(p.getEmergencyContactName(), Text.blankToNull(req.emergencyContactName()))
                || !Objects.equals(p.getEmergencyContactNumber(), Text.blankToNull(req.emergencyContactNumber()))) {
            changed.add("emergencyContact");
        }
        apply(p, req);
        auditService.log(admin ? "PATIENT_CORRECTED" : "PATIENT_UPDATED", "PATIENT", p.getPatientCode(),
                "Changed: " + (changed.isEmpty() ? "nothing" : String.join(", ", changed)), reason);
        return mapper.patient(p, admissionRepository.findFirstByPatientIdAndStatus(id, AdmissionStatus.ADMITTED).orElse(null));
    }

    @Transactional(readOnly = true)
    public PatientProfileResponse profile(Long id) {
        Patient p = patientRepository.findById(id).orElseThrow(() -> ApiException.notFound("Patient"));
        List<Admission> admissions = admissionRepository.findByPatientIdOrderByAdmittedAtAsc(id);
        List<Long> admissionIds = admissions.stream().map(Admission::getId).toList();
        List<PredictionResponse> predictions = admissionIds.isEmpty() ? List.of()
                : predictionRepository.findByAdmissionIdInOrderByCreatedAtDesc(admissionIds).stream().map(mapper::prediction).toList();
        List<IcuRequestResponse> icu = admissionIds.isEmpty() ? List.of()
                : icuRequestRepository.findByAdmissionIdInOrderByCreatedAtDesc(admissionIds).stream().map(mapper::icuRequest).toList();
        Map<Long, PredictionResponse> latest = new HashMap<>();
        predictions.forEach(pr -> latest.putIfAbsent(pr.admissionId(), pr));
        Admission active = admissions.stream().filter(Admission::isActive).findFirst().orElse(null);
        List<com.hprrims.dto.AdmissionDtos.AdmissionResponse> previous = new ArrayList<>(admissions.stream()
                .filter(a -> !a.isActive()).map(a -> mapper.admission(a, latest.get(a.getId()), null)).toList());
        Collections.reverse(previous);
        return new PatientProfileResponse(mapper.patient(p, active),
                active == null ? null : mapper.admission(active, latest.get(active.getId()), null), previous,
                admissions.stream().filter(Admission::isReadmission).count(), predictions, icu, recordsVisible());
    }

    @Transactional(readOnly = true)
    public PatientHistoryResponse history(Long id) {
        Patient p = patientRepository.findById(id).orElseThrow(() -> ApiException.notFound("Patient"));
        List<Admission> admissions = admissionRepository.findByPatientIdOrderByAdmittedAtAsc(id);
        List<Long> ids = admissions.stream().map(Admission::getId).toList();
        boolean visible = recordsVisible();
        Map<Long, List<com.hprrims.dto.MedicalRecordDtos.RecordResponse>> records = new HashMap<>();
        Map<Long, List<PredictionResponse>> preds = new HashMap<>();
        if (!ids.isEmpty()) {
            if (visible) {
                recordRepository.findByAdmissionIdInOrderByCreatedAtAsc(ids)
                        .forEach(r -> records.computeIfAbsent(r.getAdmission().getId(), k -> new ArrayList<>()).add(mapper.record(r)));
            }
            predictionRepository.findByAdmissionIdInOrderByCreatedAtDesc(ids)
                    .forEach(r -> preds.computeIfAbsent(r.getAdmission().getId(), k -> new ArrayList<>()).add(mapper.prediction(r)));
        }
        Admission active = admissions.stream().filter(Admission::isActive).findFirst().orElse(null);
        List<HistoryEntry> entries = admissions.stream().map(a -> new HistoryEntry(
                mapper.admission(a, preds.getOrDefault(a.getId(), List.of()).stream().findFirst().orElse(null), null),
                visible ? records.getOrDefault(a.getId(), List.of()) : null,
                preds.getOrDefault(a.getId(), List.of()), a.isActive())).toList();
        return new PatientHistoryResponse(mapper.patient(p, active), entries, visible);
    }

    static boolean recordsVisible() {
        Role r = CurrentUser.get().role();
        return r == Role.DOCTOR || r == Role.ADMIN;
    }

    private static void validateDob(LocalDate dob) {
        if (dob.isAfter(LocalDate.now()) || dob.isBefore(LocalDate.now().minusYears(130))) {
            throw ApiException.badRequest("INVALID_DOB", "Enter a valid date of birth that is not in the future.");
        }
    }

    private static void apply(Patient p, PatientRequest req) {
        p.setFullName(req.fullName().trim().replaceAll(" {2,}", " "));
        p.setDateOfBirth(req.dateOfBirth());
        p.setGender(req.gender());
        p.setContactNumber(req.contactNumber().trim());
        p.setEmail(Text.blankToNull(req.email()));
        p.setAddress(Text.blankToNull(req.address()));
        p.setEmergencyContactName(Text.blankToNull(req.emergencyContactName()));
        p.setEmergencyContactNumber(Text.blankToNull(req.emergencyContactNumber()));
    }
}
