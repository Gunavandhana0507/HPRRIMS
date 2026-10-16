package com.hprrims.service;

import com.hprrims.dto.MedicalRecordDtos.*;
import com.hprrims.entity.*;
import com.hprrims.exception.ApiException;
import com.hprrims.repository.*;
import com.hprrims.security.CurrentUser;
import com.hprrims.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** Append-only medical records. Corrections keep the prior version as a revision and are audited. */
@Service
@RequiredArgsConstructor
public class MedicalRecordService {

    private final MedicalRecordRepository recordRepository;
    private final MedicalRecordRevisionRepository revisionRepository;
    private final AdmissionRepository admissionRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final DtoMapper mapper;

    @Transactional(readOnly = true)
    public List<RecordResponse> list(Long admissionId) {
        if (!admissionRepository.existsById(admissionId)) {
            throw ApiException.notFound("Admission");
        }
        return recordRepository.findByAdmissionIdOrderByCreatedAtAsc(admissionId).stream().map(mapper::record).toList();
    }

    @Transactional
    public RecordResponse create(Long admissionId, RecordRequest req) {
        UserPrincipal me = CurrentUser.get();
        Admission a = admissionRepository.findDetailedById(admissionId).orElseThrow(() -> ApiException.notFound("Admission"));
        if (a.getStatus() != AdmissionStatus.ADMITTED) {
            throw ApiException.badRequest("ADMISSION_NOT_ACTIVE", "Medical records can only be added to an active admission.");
        }
        if (!Objects.equals(a.getDoctor().getId(), me.id())) {
            throw ApiException.forbidden("Only the doctor assigned to this admission can add medical records.");
        }
        requireContent(req.diagnosis(), req.prescription(), req.treatmentNotes());
        MedicalRecord m = new MedicalRecord();
        m.setAdmission(a);
        m.setDoctor(userRepository.getReferenceById(me.id()));
        m.setDiagnosis(Text.blankToNull(req.diagnosis()));
        m.setPrescription(Text.blankToNull(req.prescription()));
        m.setTreatmentNotes(Text.blankToNull(req.treatmentNotes()));
        recordRepository.saveAndFlush(m);
        m.setDoctor(userRepository.findById(me.id()).orElseThrow());
        auditService.log("MEDICAL_RECORD_CREATED", "MEDICAL_RECORD", m.getId(),
                "Added to admission " + a.getId() + " (" + a.getPatient().getPatientCode() + ")");
        return mapper.record(m);
    }

    @Transactional
    public RecordResponse correct(Long recordId, CorrectionRequest req) {
        UserPrincipal me = CurrentUser.get();
        MedicalRecord m = recordRepository.findDetailedById(recordId).orElseThrow(() -> ApiException.notFound("Medical record"));
        if (me.role() == Role.DOCTOR && !Objects.equals(m.getDoctor().getId(), me.id())) {
            throw ApiException.forbidden("Doctors can only correct records they authored.");
        }
        requireContent(req.diagnosis(), req.prescription(), req.treatmentNotes());
        List<String> changed = new ArrayList<>();
        if (!Objects.equals(m.getDiagnosis(), Text.blankToNull(req.diagnosis()))) changed.add("diagnosis");
        if (!Objects.equals(m.getPrescription(), Text.blankToNull(req.prescription()))) changed.add("prescription");
        if (!Objects.equals(m.getTreatmentNotes(), Text.blankToNull(req.treatmentNotes()))) changed.add("treatment notes");
        if (changed.isEmpty()) {
            throw ApiException.badRequest("NO_CHANGES", "The correction does not change the record.");
        }
        MedicalRecordRevision rev = new MedicalRecordRevision();
        rev.setMedicalRecord(m);
        rev.setDiagnosis(m.getDiagnosis());
        rev.setPrescription(m.getPrescription());
        rev.setTreatmentNotes(m.getTreatmentNotes());
        rev.setReason(req.reason().trim());
        rev.setRevisedBy(userRepository.getReferenceById(me.id()));
        rev.setRevisedAt(LocalDateTime.now());
        revisionRepository.save(rev);
        m.setDiagnosis(Text.blankToNull(req.diagnosis()));
        m.setPrescription(Text.blankToNull(req.prescription()));
        m.setTreatmentNotes(Text.blankToNull(req.treatmentNotes()));
        m.setCorrected(true);
        recordRepository.saveAndFlush(m);
        auditService.log("MEDICAL_RECORD_CORRECTED", "MEDICAL_RECORD", m.getId(),
                "Corrected " + String.join(", ", changed), req.reason().trim());
        return mapper.record(m);
    }

    @Transactional(readOnly = true)
    public List<RevisionResponse> revisions(Long recordId) {
        if (!recordRepository.existsById(recordId)) {
            throw ApiException.notFound("Medical record");
        }
        return revisionRepository.findByMedicalRecordIdOrderByRevisedAtDesc(recordId).stream()
                .map(r -> new RevisionResponse(r.getId(), r.getDiagnosis(), r.getPrescription(), r.getTreatmentNotes(),
                        r.getReason(), r.getRevisedBy().getFullName(), r.getRevisedAt())).toList();
    }

    private static void requireContent(String diagnosis, String prescription, String notes) {
        if (Text.blankToNull(diagnosis) == null && Text.blankToNull(prescription) == null && Text.blankToNull(notes) == null) {
            throw ApiException.badRequest("EMPTY_RECORD", "Enter a diagnosis, prescription or treatment notes.");
        }
    }
}
