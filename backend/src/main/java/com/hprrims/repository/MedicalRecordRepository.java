package com.hprrims.repository;

import com.hprrims.entity.MedicalRecord;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Long> {

    @EntityGraph(attributePaths = {"doctor"})
    List<MedicalRecord> findByAdmissionIdOrderByCreatedAtAsc(Long admissionId);

    @EntityGraph(attributePaths = {"doctor"})
    List<MedicalRecord> findByAdmissionIdInOrderByCreatedAtAsc(Collection<Long> admissionIds);

    @EntityGraph(attributePaths = {"doctor", "admission", "admission.patient"})
    @Query("select m from MedicalRecord m where m.id = :id")
    Optional<MedicalRecord> findDetailedById(@Param("id") Long id);

    long countByAdmissionId(Long admissionId);

    @EntityGraph(attributePaths = {"admission", "admission.patient"})
    List<MedicalRecord> findByDoctorIdOrderByCreatedAtDesc(Long doctorId, Pageable pageable);
}
