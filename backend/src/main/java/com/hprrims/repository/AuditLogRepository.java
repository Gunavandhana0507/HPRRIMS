package com.hprrims.repository;

import com.hprrims.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("""
            select l from AuditLog l
            where (:action is null or l.action = :action)
              and (:entityType is null or l.entityType = :entityType)
              and (:actor is null or lower(l.actorUsername) like :actor)
              and (:from is null or l.createdAt >= :from)
              and (:to is null or l.createdAt < :to)
            """)
    Page<AuditLog> search(@Param("action") String action, @Param("entityType") String entityType,
                          @Param("actor") String actor, @Param("from") LocalDateTime from,
                          @Param("to") LocalDateTime to, Pageable pageable);
}
