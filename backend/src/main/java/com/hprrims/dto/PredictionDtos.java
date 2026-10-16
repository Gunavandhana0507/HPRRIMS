package com.hprrims.dto;

import com.hprrims.entity.PredictionStatus;
import com.hprrims.entity.PredictionTrigger;
import com.hprrims.entity.RiskLevel;

import java.time.LocalDateTime;
import java.util.List;

public final class PredictionDtos {

    private PredictionDtos() {
    }

    public record Factor(String feature, String label, double value, double contribution) {
    }

    public record PredictionResponse(Long id, Long admissionId, Long patientId, String patientCode, String patientName,
                                     String doctorName, double probability, RiskLevel riskLevel, String modelVersion,
                                     List<Factor> topFactors, PredictionTrigger triggerSource, String requestedByName,
                                     LocalDateTime createdAt) {
    }

    public record PredictionOutcome(PredictionStatus status, PredictionResponse prediction, String message) {
    }
}
