package com.hprrims.repository;

import com.hprrims.entity.IcuRequest;
import com.hprrims.entity.IcuRequestStatus;
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

public interface IcuRequestRepository extends JpaRepository<IcuRequest, Long> {

    @EntityGraph(attributePaths = {"admission", "admission.patient", "admission.doctor", "requestedBy", "bed", "decidedBy"})
    @Query("select r from IcuRequest r where r.id = :id")
    Optional<IcuRequest> findDetailedById(@Param("id") Long id);

    long countByStatus(IcuRequestStatus status);

    boolean existsByAdmissionIdAndStatusIn(Long admissionId, Collection<IcuRequestStatus> statuses);

    List<IcuRequest> findByAdmissionIdAndStatusIn(Long admissionId, Collection<IcuRequestStatus> statuses);

    @EntityGraph(attributePaths = {"requestedBy", "bed", "decidedBy"})
    List<IcuRequest> findByAdmissionIdInOrderByCreatedAtDesc(Collection<Long> admissionIds);

    @EntityGraph(attributePaths = {"admission", "admission.patient"})
    List<IcuRequest> findByStatusAndBedIdIn(IcuRequestStatus status, Collection<Long> bedIds);

    @EntityGraph(attributePaths = {"admission", "admission.patient", "admission.doctor", "requestedBy", "bed"})
    @Query("""
            select r from IcuRequest r
            where (:status is null or r.status = :status)
              and (:patientQ is null or lower(r.admission.patient.patientCode) like :patientQ or lower(r.admission.patient.fullName) like :patientQ)
            """)
    Page<IcuRequest> search(@Param("status") IcuRequestStatus status, @Param("patientQ") String patientQ, Pageable pageable);

    @Query("select r.priorityLevel, count(r) from IcuRequest r where r.priorityLevel is not null group by r.priorityLevel")
    List<Object[]> priorityDistribution();

    @EntityGraph(attributePaths = {"admission", "admission.patient", "requestedBy", "bed", "decidedBy"})
    @Query("""
            select r from IcuRequest r
            where (:from is null or r.createdAt >= :from) and (:to is null or r.createdAt < :to)
            order by r.createdAt desc
            """)
    List<IcuRequest> findForReport(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
