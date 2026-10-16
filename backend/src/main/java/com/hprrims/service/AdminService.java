package com.hprrims.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.hprrims.dto.AdminDtos.AuditLogResponse;
import com.hprrims.dto.AdminDtos.MlStatusResponse;
import com.hprrims.dto.PageResponse;
import com.hprrims.exception.ApiException;
import com.hprrims.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final AuditLogRepository auditLogRepository;
    private final MlClient mlClient;

    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> auditLogs(String action, String entityType, String actor, LocalDate from,
                                                    LocalDate to, int page, int size) {
        if (from != null && to != null && to.isBefore(from)) {
            throw ApiException.badRequest("INVALID_RANGE", "The end date must be on or after the start date.");
        }
        var result = auditLogRepository.search(Text.blankToNull(action), Text.blankToNull(entityType), Text.like(actor),
                from == null ? null : from.atStartOfDay(), to == null ? null : to.plusDays(1).atStartOfDay(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return PageResponse.of(result, l -> new AuditLogResponse(l.getId(), l.getActorUsername(), l.getActorRole(),
                l.getAction(), l.getEntityType(), l.getEntityId(), l.getDetails(), l.getReason(), l.getIpAddress(),
                l.getCreatedAt()));
    }

    public MlStatusResponse mlStatus() {
        try {
            JsonNode m = mlClient.models();
            return new MlStatusResponse(true, describe(m.path("readmission")), describe(m.path("icu_priority")),
                    "ML service is reachable.");
        } catch (MlClient.MlUnavailableException e) {
            return new MlStatusResponse(false, null, null,
                    "ML service is unreachable. Predictions and ICU scoring are paused; core workflows still work.");
        }
    }

    private static String describe(JsonNode n) {
        if (n.isMissingNode()) return null;
        String algo = n.path("algorithm").asText("");
        String version = n.path("version").asText("");
        return (algo + " " + version).trim();
    }
}
