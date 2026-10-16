package com.hprrims.repository;

import com.hprrims.entity.MedicalRecordRevision;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicalRecordRevisionRepository extends JpaRepository<MedicalRecordRevision, Long> {

    @EntityGraph(attributePaths = {"revisedBy"})
    List<MedicalRecordRevision> findByMedicalRecordIdOrderByRevisedAtDesc(Long medicalRecordId);
}
