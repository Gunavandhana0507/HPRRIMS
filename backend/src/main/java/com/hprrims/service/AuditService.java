package com.hprrims.service;

import com.hprrims.entity.AuditLog;
import com.hprrims.repository.AuditLogRepository;
import com.hprrims.security.CurrentUser;
import com.hprrims.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repository;

    /** Records an audit entry inside the caller's transaction, so failed operations leave no entry. */
    @Transactional(propagation = Propagation.REQUIRED)
    public void log(String action, String entityType, Object entityId, String details, String reason) {
        UserPrincipal p = CurrentUser.getOrNull();
        write(p == null ? null : p.id(), p == null ? null : p.username(), p == null ? null : p.role().name(),
                action, entityType, entityId, details, reason);
    }

    public void log(String action, String entityType, Object entityId, String details) {
        log(action, entityType, entityId, details, null);
    }

    /** Independent entry (e.g. failed logins) that must persist regardless of the caller's outcome. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAnonymous(Long actorId, String username, String role, String action, String details) {
        write(actorId, username, role, action, "AUTH", actorId, details, null);
    }

    private void write(Long actorId, String username, String role, String action, String entityType,
                       Object entityId, String details, String reason) {
        AuditLog log = new AuditLog();
        log.setActorId(actorId);
        log.setActorUsername(username == null ? null : truncate(username, 50));
        log.setActorRole(role);
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId == null ? null : String.valueOf(entityId));
        log.setDetails(details);
        log.setReason(reason);
        log.setIpAddress(clientIp());
        log.setCreatedAt(LocalDateTime.now());
        repository.save(log);
    }

    private static String clientIp() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            HttpServletRequest req = attrs.getRequest();
            return truncate(req.getRemoteAddr(), 45);
        }
        return null;
    }

    private static String truncate(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }
}
