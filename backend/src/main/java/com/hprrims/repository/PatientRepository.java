package com.hprrims.repository;

import com.hprrims.entity.Gender;
import com.hprrims.entity.Patient;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

public interface PatientRepository extends JpaRepository<Patient, Long> {

    Optional<Patient> findByPatientCodeIgnoreCase(String patientCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Patient p where p.id = :id")
    Optional<Patient> findByIdForUpdate(@Param("id") Long id);

    long countByCreatedAtGreaterThanEqual(LocalDateTime since);

    @Query("""
            select p from Patient p
            where (:q is null or lower(p.fullName) like :q or lower(p.patientCode) like :q or p.contactNumber like :q)
              and (:gender is null or p.gender = :gender)
              and (:dobFrom is null or p.dateOfBirth >= :dobFrom)
              and (:dobTo is null or p.dateOfBirth <= :dobTo)
            """)
    Page<Patient> search(@Param("q") String q,
                         @Param("gender") Gender gender,
                         @Param("dobFrom") LocalDate dobFrom,
                         @Param("dobTo") LocalDate dobTo,
                         Pageable pageable);
}
