package com.hprrims.dto;

import com.hprrims.entity.IcuBedStatus;
import com.hprrims.entity.IcuPriority;
import com.hprrims.entity.IcuRequestStatus;
import com.hprrims.entity.ScoringStatus;
import jakarta.validation.constraints.*;

import java.time.LocalDateTime;
import java.util.Map;

public final class IcuDtos {

    private IcuDtos() {
    }

    public record BedRequest(
            @NotBlank(message = "Bed number is required")
            @Pattern(regexp = "^[A-Za-z0-9-]{2,20}$", message = "Use 2-20 letters, numbers or hyphens") String bedNumber,
            @NotBlank(message = "Ward is required") @Size(max = 60) String ward) {
    }

    public record BedStatusRequest(@NotNull(message = "Status is required") IcuBedStatus status) {
    }

    public record BedResponse(Long id, String bedNumber, String ward, IcuBedStatus status, Long currentRequestId,
                              Long admissionId, String patientCode, String patientName) {
    }

    public record CreateIcuRequest(
            @NotNull(message = "Select an admission") Long admissionId,
            @NotNull(message = "Required") @Min(value = 20, message = "Must be 20-250 bpm") @Max(value = 250, message = "Must be 20-250 bpm") Integer heartRate,
            @NotNull(message = "Required") @Min(value = 40, message = "Must be 40-260 mmHg") @Max(value = 260, message = "Must be 40-260 mmHg") Integer systolicBp,
            @NotNull(message = "Required") @Min(value = 4, message = "Must be 4-60 /min") @Max(value = 60, message = "Must be 4-60 /min") Integer respiratoryRate,
            @NotNull(message = "Required") @Min(value = 50, message = "Must be 50-100%") @Max(value = 100, message = "Must be 50-100%") Integer spo2,
            @NotNull(message = "Required") @DecimalMin(value = "30.0", message = "Must be 30-43 C") @DecimalMax(value = "43.0", message = "Must be 30-43 C") Double temperature,
            @NotNull(message = "Required") @Min(value = 3, message = "GCS must be 3-15") @Max(value = 15, message = "GCS must be 3-15") Integer gcs,
            @NotNull(message = "Required") Boolean requiresVentilation,
            @NotNull(message = "Required") @Min(value = 0, message = "Must be 0-20") @Max(value = 20, message = "Must be 0-20") Integer comorbidityCount,
            @Size(max = 2000) String clinicalNotes) {
    }

    public record AllocateRequest(@NotNull(message = "Select a bed") Long bedId, @Size(max = 500) String notes) {
    }

    public record DecisionRequest(@Size(max = 500) String notes) {
    }

    public record IcuRequestResponse(Long id, Long admissionId, Long patientId, String patientCode, String patientName,
                                     Integer patientAge, String doctorName, int heartRate, int systolicBp,
                                     int respiratoryRate, int spo2, double temperature, int gcs,
                                     boolean requiresVentilation, int comorbidityCount, String clinicalNotes,
                                     IcuPriority priorityLevel, Double priorityScore,
                                     Map<String, Double> classProbabilities, String modelVersion,
                                     ScoringStatus scoringStatus, IcuRequestStatus status, Long bedId,
                                     String bedNumber, String requestedByName, String decidedByName,
                                     LocalDateTime decidedAt, String decisionNotes, LocalDateTime releasedAt,
                                     LocalDateTime createdAt) {
    }
}
