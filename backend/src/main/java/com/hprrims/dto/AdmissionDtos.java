package com.hprrims.dto;

import com.hprrims.entity.AdmissionStatus;
import com.hprrims.entity.PredictionStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

public final class AdmissionDtos {

    private AdmissionDtos() {
    }

    public record CreateAdmissionRequest(
            @NotNull(message = "Select a patient") Long patientId,
            @NotNull(message = "Assign a doctor") Long doctorId,
            @NotNull(message = "Admission date and time is required") LocalDateTime admittedAt,
            @NotBlank(message = "Admission reason is required") @Size(max = 500, message = "Keep the reason under 500 characters")
            String reason,
            @Size(max = 60) String ward) {
    }

    public record ReassignDoctorRequest(@NotNull(message = "Select a doctor") Long doctorId) {
    }

    public record DischargeRequest(
            @NotNull(message = "Discharge date and time is required") LocalDateTime dischargedAt,
            @NotBlank(message = "Discharge summary is required") @Size(max = 10000) String dischargeSummary,
            @Size(max = 5000) String followUpNotes) {
    }

    public record DischargeUpdateRequest(
            @NotNull(message = "Discharge date and time is required") LocalDateTime dischargedAt,
            @NotBlank(message = "Discharge summary is required") @Size(max = 10000) String dischargeSummary,
            @Size(max = 5000) String followUpNotes,
            @Size(max = 500) String reason) {
    }

    public record AdmissionResponse(
            Long id, Long patientId, String patientCode, String patientName, Integer patientAge, String patientGender,
            Long doctorId, String doctorName, LocalDateTime admittedAt, String reason, String ward,
            AdmissionStatus status, boolean readmission, Long previousAdmissionId, Integer daysSincePreviousDischarge,
            int readmissionWindowDays, LocalDateTime dischargedAt, String dischargeSummary, String followUpNotes,
            LocalDateTime dischargeRecordedAt, String dischargedByName, LocalDateTime staffEditableUntil,
            PredictionStatus predictionStatus, Double lengthOfStayDays, String createdByName, LocalDateTime createdAt,
            PredictionDtos.PredictionResponse latestPrediction,
            List<IcuDtos.IcuRequestResponse> icuRequests) {
    }

    public record DischargeResponse(AdmissionResponse admission, PredictionDtos.PredictionOutcome prediction) {
    }
}
