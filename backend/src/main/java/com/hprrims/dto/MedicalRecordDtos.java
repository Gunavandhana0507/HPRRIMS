package com.hprrims.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class MedicalRecordDtos {

    private MedicalRecordDtos() {
    }

    public record RecordRequest(
            @Size(max = 500, message = "Keep the diagnosis under 500 characters") String diagnosis,
            @Size(max = 5000) String prescription,
            @Size(max = 10000) String treatmentNotes) {
    }

    public record CorrectionRequest(
            @Size(max = 500) String diagnosis,
            @Size(max = 5000) String prescription,
            @Size(max = 10000) String treatmentNotes,
            @NotBlank(message = "A correction reason is required") @Size(max = 500) String reason) {
    }

    public record RecordResponse(Long id, Long admissionId, Long patientId, String patientCode, String patientName,
                                 Long doctorId, String doctorName, String diagnosis, String prescription,
                                 String treatmentNotes, boolean corrected, LocalDateTime createdAt,
                                 LocalDateTime updatedAt) {
    }

    public record RevisionResponse(Long id, String diagnosis, String prescription, String treatmentNotes,
                                   String reason, String revisedByName, LocalDateTime revisedAt) {
    }
}
