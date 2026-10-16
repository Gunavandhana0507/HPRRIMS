package com.hprrims.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.hprrims.dto.PredictionDtos.PredictionOutcome;
import com.hprrims.dto.PredictionDtos.PredictionResponse;
import com.hprrims.entity.*;
import com.hprrims.exception.ApiException;
import com.hprrims.repository.*;
import com.hprrims.security.CurrentUser;
import com.hprrims.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class PredictionService {

    public static final String UNAVAILABLE_MESSAGE =
            "Readmission risk prediction is temporarily unavailable. The discharge is saved; retry when the ML service is back.";

    private final AdmissionRepository admissionRepository;
    private final MedicalRecordRepository recordRepository;
    private final ReadmissionPredictionRepository predictionRepository;
    private final IcuRequestRepository icuRequestRepository;
    private final UserRepository userRepository;
    private final MlClient mlClient;
    private final DtoMapper mapper;
    private final AuditService auditService;

    @Transactional
    public PredictionOutcome predict(Long admissionId, PredictionTrigger trigger) {
        Admission a = admissionRepository.findDetailedById(admissionId).orElseThrow(() -> ApiException.notFound("Admission"));
        if (a.getStatus() != AdmissionStatus.DISCHARGED) {
            throw ApiException.badRequest("NOT_DISCHARGED", "Readmission risk is predicted after the patient is discharged.");
        }
        UserPrincipal actor = CurrentUser.getOrNull();
        if (trigger == PredictionTrigger.MANUAL && actor != null && actor.role() == Role.DOCTOR
                && !Objects.equals(a.getDoctor().getId(), actor.id())) {
            throw ApiException.forbidden("Only the assigned doctor can request a prediction for this admission.");
        }
        Map<String, Object> features = features(a);
        try {
            JsonNode r = mlClient.predictReadmission(features);
            ReadmissionPrediction p = new ReadmissionPrediction();
            p.setAdmission(a);
            p.setProbability(r.path("probability").asDouble());
            p.setRiskLevel(RiskLevel.valueOf(r.path("risk_level").asText()));
            p.setModelVersion(r.path("model_version").asText("unknown"));
            p.setTopFactors(r.has("top_factors") ? r.get("top_factors").toString() : "[]");
            p.setInputFeatures(mapper.toJson(features));
            p.setTriggerSource(trigger);
            p.setRequestedBy(actor == null ? null : userRepository.getReferenceById(actor.id()));
            p.setCreatedAt(LocalDateTime.now());
            predictionRepository.save(p);
            a.setPredictionStatus(PredictionStatus.AVAILABLE);
            auditService.log("PREDICTION_CREATED", "ADMISSION", a.getId(),
                    "Readmission risk " + p.getRiskLevel() + " (" + Math.round(p.getProbability() * 100) + "%), trigger " + trigger);
            return new PredictionOutcome(PredictionStatus.AVAILABLE, mapper.prediction(p), null);
        } catch (MlClient.MlUnavailableException | IllegalArgumentException e) {
            a.setPredictionStatus(PredictionStatus.UNAVAILABLE);
            auditService.log("PREDICTION_UNAVAILABLE", "ADMISSION", a.getId(), "ML service unavailable, trigger " + trigger);
            return new PredictionOutcome(PredictionStatus.UNAVAILABLE, null, UNAVAILABLE_MESSAGE);
        }
    }

    @Transactional(readOnly = true)
    public com.hprrims.dto.PageResponse<PredictionResponse> latest(RiskLevel riskLevel, boolean mine, int page, int size) {
        UserPrincipal me = CurrentUser.get();
        Long doctorId = mine && me.role() == Role.DOCTOR ? me.id() : null;
        var pageable = org.springframework.data.domain.PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        return com.hprrims.dto.PageResponse.of(predictionRepository.findLatestPage(doctorId, riskLevel, pageable), mapper::prediction);
    }

    @Transactional(readOnly = true)
    public List<PredictionResponse> forAdmission(Long admissionId) {
        if (!admissionRepository.existsById(admissionId)) {
            throw ApiException.notFound("Admission");
        }
        return predictionRepository.findByAdmissionIdOrderByCreatedAtDesc(admissionId).stream().map(mapper::prediction).toList();
    }

    Map<String, Object> features(Admission a) {
        Patient patient = a.getPatient();
        LocalDateTime admitted = a.getAdmittedAt();
        double los = Duration.between(admitted, a.getDischargedAt()).toMinutes() / 1440.0;
        Map<String, Object> f = new LinkedHashMap<>();
        f.put("age", Math.min(120, patient.ageOn(admitted.toLocalDate())));
        f.put("gender", patient.getGender().name());
        f.put("length_of_stay_days", Math.round(Math.max(0, los) * 100) / 100.0);
        f.put("prior_admissions_12m", admissionRepository.countPriorAdmissions(patient.getId(), a.getId(),
                admitted.minusMonths(12), admitted));
        f.put("prior_readmissions", admissionRepository.countPriorReadmissions(patient.getId(), a.getId(), admitted));
        f.put("medical_record_count", recordRepository.countByAdmissionId(a.getId()));
        f.put("had_icu_stay", icuRequestRepository.existsByAdmissionIdAndStatusIn(a.getId(),
                List.of(IcuRequestStatus.ALLOCATED, IcuRequestStatus.RELEASED)));
        f.put("is_readmission", a.isReadmission());
        f.put("days_since_previous_discharge", a.getDaysSincePreviousDischarge());
        return f;
    }
}
