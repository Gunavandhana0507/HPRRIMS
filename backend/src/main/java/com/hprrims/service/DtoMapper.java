package com.hprrims.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hprrims.dto.AdmissionDtos.AdmissionResponse;
import com.hprrims.dto.IcuDtos.BedResponse;
import com.hprrims.dto.IcuDtos.IcuRequestResponse;
import com.hprrims.dto.MedicalRecordDtos.RecordResponse;
import com.hprrims.dto.PatientDtos.PatientResponse;
import com.hprrims.dto.PredictionDtos.Factor;
import com.hprrims.dto.PredictionDtos.PredictionResponse;
import com.hprrims.dto.UserDtos.UserResponse;
import com.hprrims.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class DtoMapper {

    private final ObjectMapper objectMapper;

    @Value("${app.discharge.staff-edit-window-hours}")
    private int staffEditHours;

    public UserResponse user(User u) {
        return new UserResponse(u.getId(), u.getUsername(), u.getFullName(), u.getEmail(), u.getRole(),
                u.getSpecialization(), u.isActive(), u.getLastLoginAt(), u.getCreatedAt());
    }

    public PatientResponse patient(Patient p, Admission active) {
        return new PatientResponse(p.getId(), p.getPatientCode(), p.getFullName(), p.getDateOfBirth(), p.currentAge(),
                p.getGender(), p.getContactNumber(), p.getEmail(), p.getAddress(), p.getEmergencyContactName(),
                p.getEmergencyContactNumber(), p.getCreatedAt(),
                p.getCreatedBy() == null ? null : p.getCreatedBy().getFullName(),
                active == null ? null : AdmissionStatus.ADMITTED, active == null ? null : active.getId());
    }

    public AdmissionResponse admission(Admission a) {
        return admission(a, null, null);
    }

    public AdmissionResponse admission(Admission a, PredictionResponse latest, List<IcuRequestResponse> icu) {
        Patient p = a.getPatient();
        LocalDateTime end = a.getDischargedAt() != null ? a.getDischargedAt() : LocalDateTime.now();
        double los = Math.max(0, Duration.between(a.getAdmittedAt(), end).toMinutes()) / 1440.0;
        LocalDateTime editableUntil = a.getDischargeRecordedAt() == null ? null
                : a.getDischargeRecordedAt().plusHours(staffEditHours);
        return new AdmissionResponse(a.getId(), p.getId(), p.getPatientCode(), p.getFullName(),
                p.ageOn(a.getAdmittedAt().toLocalDate()), p.getGender().name(),
                a.getDoctor().getId(), a.getDoctor().getFullName(), a.getAdmittedAt(), a.getReason(), a.getWard(),
                a.getStatus(), a.isReadmission(),
                a.getPreviousAdmission() == null ? null : a.getPreviousAdmission().getId(),
                a.getDaysSincePreviousDischarge(), a.getReadmissionWindowDays(), a.getDischargedAt(),
                a.getDischargeSummary(), a.getFollowUpNotes(), a.getDischargeRecordedAt(),
                a.getDischargedBy() == null ? null : a.getDischargedBy().getFullName(), editableUntil,
                a.getPredictionStatus(), Math.round(los * 10) / 10.0,
                a.getCreatedBy() == null ? null : a.getCreatedBy().getFullName(), a.getCreatedAt(), latest, icu);
    }

    public RecordResponse record(MedicalRecord m) {
        Admission a = m.getAdmission();
        Patient p = a.getPatient();
        return new RecordResponse(m.getId(), a.getId(), p.getId(), p.getPatientCode(), p.getFullName(),
                m.getDoctor().getId(), m.getDoctor().getFullName(), m.getDiagnosis(), m.getPrescription(),
                m.getTreatmentNotes(), m.isCorrected(), m.getCreatedAt(), m.getUpdatedAt());
    }

    public PredictionResponse prediction(ReadmissionPrediction r) {
        Admission a = r.getAdmission();
        List<Factor> factors = List.of();
        if (r.getTopFactors() != null) {
            try {
                factors = objectMapper.readValue(r.getTopFactors(), new TypeReference<List<Factor>>() {
                });
            } catch (Exception ignored) {
                factors = List.of();
            }
        }
        return new PredictionResponse(r.getId(), a.getId(), a.getPatient().getId(), a.getPatient().getPatientCode(),
                a.getPatient().getFullName(), a.getDoctor().getFullName(), r.getProbability(), r.getRiskLevel(),
                r.getModelVersion(), factors, r.getTriggerSource(),
                r.getRequestedBy() == null ? null : r.getRequestedBy().getFullName(), r.getCreatedAt());
    }

    public IcuRequestResponse icuRequest(IcuRequest r) {
        Admission a = r.getAdmission();
        Patient p = a.getPatient();
        Map<String, Double> probs = null;
        if (r.getClassProbabilities() != null) {
            try {
                probs = objectMapper.readValue(r.getClassProbabilities(), new TypeReference<Map<String, Double>>() {
                });
            } catch (Exception ignored) {
                probs = null;
            }
        }
        return new IcuRequestResponse(r.getId(), a.getId(), p.getId(), p.getPatientCode(), p.getFullName(),
                p.currentAge(), a.getDoctor().getFullName(), r.getHeartRate(), r.getSystolicBp(),
                r.getRespiratoryRate(), r.getSpo2(), r.getTemperature(), r.getGcs(), r.isRequiresVentilation(),
                r.getComorbidityCount(), r.getClinicalNotes(), r.getPriorityLevel(), r.getPriorityScore(), probs,
                r.getModelVersion(), r.getScoringStatus(), r.getStatus(),
                r.getBed() == null ? null : r.getBed().getId(), r.getBed() == null ? null : r.getBed().getBedNumber(),
                r.getRequestedBy().getFullName(), r.getDecidedBy() == null ? null : r.getDecidedBy().getFullName(),
                r.getDecidedAt(), r.getDecisionNotes(), r.getReleasedAt(), r.getCreatedAt());
    }

    public BedResponse bed(IcuBed b, IcuRequest current) {
        return new BedResponse(b.getId(), b.getBedNumber(), b.getWard(), b.getStatus(),
                current == null ? null : current.getId(),
                current == null ? null : current.getAdmission().getId(),
                current == null ? null : current.getAdmission().getPatient().getPatientCode(),
                current == null ? null : current.getAdmission().getPatient().getFullName());
    }

    public String toJson(Object o) {
        try {
            return objectMapper.writeValueAsString(o);
        } catch (Exception e) {
            return null;
        }
    }
}
