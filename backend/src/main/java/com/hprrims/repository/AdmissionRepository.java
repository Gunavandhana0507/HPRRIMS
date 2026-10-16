package com.hprrims.repository;

import com.hprrims.entity.Admission;
import com.hprrims.entity.AdmissionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AdmissionRepository extends JpaRepository<Admission, Long> {

    @EntityGraph(attributePaths = {"patient", "doctor"})
    @Query("select a from Admission a where a.id = :id")
    Optional<Admission> findDetailedById(@Param("id") Long id);

    boolean existsByPatientIdAndStatus(Long patientId, AdmissionStatus status);

    @EntityGraph(attributePaths = {"doctor"})
    Optional<Admission> findFirstByPatientIdAndStatus(Long patientId, AdmissionStatus status);

    Optional<Admission> findFirstByPatientIdAndStatusAndDischargedAtNotNullOrderByDischargedAtDesc(
            Long patientId, AdmissionStatus status);

    @EntityGraph(attributePaths = {"doctor", "previousAdmission"})
    List<Admission> findByPatientIdOrderByAdmittedAtAsc(Long patientId);

    @EntityGraph(attributePaths = {"patient"})
    List<Admission> findByDoctorIdAndStatusOrderByAdmittedAtDesc(Long doctorId, AdmissionStatus status);

    @EntityGraph(attributePaths = {"doctor"})
    List<Admission> findByStatusAndPatientIdIn(AdmissionStatus status, Collection<Long> patientIds);

    long countByStatus(AdmissionStatus status);

    long countByReadmissionTrue();

    long countByAdmittedAtBetween(LocalDateTime from, LocalDateTime to);

    long countByDischargedAtBetween(LocalDateTime from, LocalDateTime to);

    @EntityGraph(attributePaths = {"patient", "doctor"})
    List<Admission> findByAdmittedAtBetweenOrderByAdmittedAtDesc(LocalDateTime from, LocalDateTime to);

    @EntityGraph(attributePaths = {"patient", "doctor"})
    List<Admission> findByDischargedAtBetweenOrderByDischargedAtDesc(LocalDateTime from, LocalDateTime to);

    @Query("""
            select count(a) from Admission a
            where a.patient.id = :patientId and a.id <> :excludeId
              and a.admittedAt >= :from and a.admittedAt < :to
            """)
    long countPriorAdmissions(@Param("patientId") Long patientId, @Param("excludeId") Long excludeId,
                              @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("""
            select count(a) from Admission a
            where a.patient.id = :patientId and a.id <> :excludeId
              and a.readmission = true and a.admittedAt < :before
            """)
    long countPriorReadmissions(@Param("patientId") Long patientId, @Param("excludeId") Long excludeId,
                                @Param("before") LocalDateTime before);

    @EntityGraph(attributePaths = {"patient", "doctor"})
    @Query("""
            select a from Admission a
            where (:status is null or a.status = :status)
              and (:from is null or a.admittedAt >= :from)
              and (:to is null or a.admittedAt < :to)
              and (:patientQ is null or lower(a.patient.patientCode) like :patientQ or lower(a.patient.fullName) like :patientQ)
              and (:doctorId is null or a.doctor.id = :doctorId)
              and (:readmission is null or a.readmission = :readmission)
            """)
    Page<Admission> search(@Param("status") AdmissionStatus status,
                           @Param("from") LocalDateTime from,
                           @Param("to") LocalDateTime to,
                           @Param("patientQ") String patientQ,
                           @Param("doctorId") Long doctorId,
                           @Param("readmission") Boolean readmission,
                           Pageable pageable);

    @Query(value = """
            select date_format(admitted_at, '%Y-%m') as period, count(*) as total, sum(is_readmission) as readmissions
            from admissions
            where admitted_at >= :from
            group by period order by period
            """, nativeQuery = true)
    List<Object[]> monthlyAdmissionStats(@Param("from") LocalDateTime from);

    @EntityGraph(attributePaths = {"patient", "doctor", "previousAdmission"})
    @Query("""
            select a from Admission a
            where (:from is null or a.admittedAt >= :from) and (:to is null or a.admittedAt < :to)
              and (:readmissionOnly = false or a.readmission = true)
            order by a.admittedAt desc
            """)
    List<Admission> findForReport(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to,
                                  @Param("readmissionOnly") boolean readmissionOnly);
}
