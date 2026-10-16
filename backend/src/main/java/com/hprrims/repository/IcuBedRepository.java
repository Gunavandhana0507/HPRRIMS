package com.hprrims.repository;

import com.hprrims.entity.IcuBed;
import com.hprrims.entity.IcuBedStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface IcuBedRepository extends JpaRepository<IcuBed, Long> {

    List<IcuBed> findAllByOrderByWardAscBedNumberAsc();

    long countByStatus(IcuBedStatus status);

    boolean existsByBedNumberIgnoreCase(String bedNumber);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from IcuBed b where b.id = :id")
    Optional<IcuBed> findByIdForUpdate(@Param("id") Long id);
}
