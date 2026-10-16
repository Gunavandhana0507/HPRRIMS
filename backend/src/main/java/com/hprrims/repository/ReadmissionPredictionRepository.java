package com.hprrims.repository;

import com.hprrims.entity.ReadmissionPrediction;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReadmissionPredictionRepository extends JpaRepository<ReadmissionPrediction, Long> {

    @EntityGraph(attributePaths = {"requestedBy"})
    List<ReadmissionPrediction> findByAdmissionIdOrderByCreatedAtDesc(Long admissionId);

    @EntityGraph(attributePaths = {"requestedBy"})
    List<ReadmissionPrediction> findByAdmissionIdInOrderByCreatedAtDesc(Collection<Long> admissionIds);

    Optional<ReadmissionPrediction> findFirstByAdmissionIdOrderByCreatedAtDesc(Long admissionId);

    /** Latest prediction per admission. */
    @EntityGraph(attributePaths = {"admission", "admission.patient", "admission.doctor"})
    @Query("""
            select p from ReadmissionPrediction p
            where p.createdAt = (select max(p2.createdAt) from ReadmissionPrediction p2 where p2.admission = p.admission)
              and (:doctorId is null or p.admission.doctor.id = :doctorId)
            order by p.createdAt desc
            """)
    List<ReadmissionPrediction> findLatestPerAdmission(@Param("doctorId") Long doctorId, Pageable pageable);

    @Query(value = """
            select p.risk_level, count(*) from readmission_predictions p
            join admissions a on a.id = p.admission_id
            where p.created_at = (select max(p2.created_at) from readmission_predictions p2 where p2.admission_id = p.admission_id)
              and (:doctorId is null or a.doctor_id = :doctorId)
            group by p.risk_level
            """, nativeQuery = true)
    List<Object[]> latestRiskDistribution(@Param("doctorId") Long doctorId);

    @EntityGraph(attributePaths = {"admission", "admission.patient", "requestedBy"})
    @Query("""
            select p from ReadmissionPrediction p
            where (:from is null or p.createdAt >= :from) and (:to is null or p.createdAt < :to)
            order by p.createdAt desc
            """)
    List<ReadmissionPrediction> findForReport(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @EntityGraph(attributePaths = {"admission", "admission.patient", "admission.doctor", "requestedBy"})
    @Query(value = """
            select p from ReadmissionPrediction p
            where p.createdAt = (select max(p2.createdAt) from ReadmissionPrediction p2 where p2.admission = p.admission)
              and (:doctorId is null or p.admission.doctor.id = :doctorId)
              and (:riskLevel is null or p.riskLevel = :riskLevel)
            order by p.probability desc, p.createdAt desc
            """,
            countQuery = """
            select count(p) from ReadmissionPrediction p
            where p.createdAt = (select max(p2.createdAt) from ReadmissionPrediction p2 where p2.admission = p.admission)
              and (:doctorId is null or p.admission.doctor.id = :doctorId)
              and (:riskLevel is null or p.riskLevel = :riskLevel)
            """)
    org.springframework.data.domain.Page<ReadmissionPrediction> findLatestPage(@Param("doctorId") Long doctorId,
            @Param("riskLevel") com.hprrims.entity.RiskLevel riskLevel, Pageable pageable);
}
