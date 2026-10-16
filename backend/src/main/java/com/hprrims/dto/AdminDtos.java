package com.hprrims.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public final class AdminDtos {

    private AdminDtos() {
    }

    public record AuditLogResponse(Long id, String actorUsername, String actorRole, String action, String entityType,
                                   String entityId, String details, String reason, String ipAddress,
                                   LocalDateTime createdAt) {
    }

    public record SettingsResponse(int readmissionWindowDays, int staffDischargeEditHours) {
    }

    public record ReadmissionWindowRequest(
            @NotNull(message = "Window is required")
            @Min(value = 1, message = "Window must be between 1 and 365 days")
            @Max(value = 365, message = "Window must be between 1 and 365 days") Integer days) {
    }

    public record MlStatusResponse(boolean available, String readmissionModel, String icuModel, String message) {
    }
}
