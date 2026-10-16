package com.hprrims.repository;

import com.hprrims.entity.Role;
import com.hprrims.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    List<User> findByRoleAndActiveTrueOrderByFullNameAsc(Role role);

    long countByRoleAndActiveTrue(Role role);

    @Query("""
            select u from User u
            where (:role is null or u.role = :role)
              and (:active is null or u.active = :active)
              and (:q is null or lower(u.username) like :q or lower(u.fullName) like :q)
            """)
    Page<User> search(@Param("q") String q, @Param("role") Role role, @Param("active") Boolean active, Pageable pageable);
}
