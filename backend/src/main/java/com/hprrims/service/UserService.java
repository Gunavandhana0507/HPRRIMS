package com.hprrims.service;

import com.hprrims.dto.PageResponse;
import com.hprrims.dto.UserDtos.*;
import com.hprrims.entity.Role;
import com.hprrims.entity.User;
import com.hprrims.exception.ApiException;
import com.hprrims.repository.UserRepository;
import com.hprrims.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final DtoMapper mapper;

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> search(String q, Role role, Boolean active, int page, int size) {
        String like = Text.like(q);
        var result = userRepository.search(like, role, active,
                PageRequest.of(page, size, Sort.by("role").ascending().and(Sort.by("fullName"))));
        return PageResponse.of(result, mapper::user);
    }

    @Transactional(readOnly = true)
    public List<DoctorOption> activeDoctors() {
        return userRepository.findByRoleAndActiveTrueOrderByFullNameAsc(Role.DOCTOR).stream()
                .map(u -> new DoctorOption(u.getId(), u.getFullName(), u.getSpecialization())).toList();
    }

    @Transactional
    public UserResponse create(CreateUserRequest req) {
        if (userRepository.existsByUsernameIgnoreCase(req.username())) {
            throw ApiException.conflict("USERNAME_TAKEN", "That username is already in use.");
        }
        String email = Text.blankToNull(req.email());
        if (email != null && userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("EMAIL_TAKEN", "That email is already in use.");
        }
        User u = new User();
        u.setUsername(req.username().trim());
        u.setPasswordHash(passwordEncoder.encode(req.password()));
        u.setFullName(req.fullName().trim());
        u.setEmail(email);
        u.setRole(req.role());
        u.setSpecialization(Text.blankToNull(req.specialization()));
        u.setActive(true);
        userRepository.save(u);
        auditService.log("USER_CREATED", "USER", u.getId(), "Created " + u.getUsername() + " as " + u.getRole());
        return mapper.user(u);
    }

    @Transactional
    public UserResponse update(Long id, UpdateUserRequest req) {
        User u = userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User"));
        String email = Text.blankToNull(req.email());
        if (email != null && userRepository.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw ApiException.conflict("EMAIL_TAKEN", "That email is already in use.");
        }
        if (Objects.equals(id, CurrentUser.get().id()) && req.role() != u.getRole()) {
            throw ApiException.badRequest("SELF_ROLE_CHANGE", "You cannot change your own role.");
        }
        List<String> changes = new ArrayList<>();
        if (!Objects.equals(u.getFullName(), req.fullName().trim())) changes.add("name");
        if (!Objects.equals(u.getEmail(), email)) changes.add("email");
        if (u.getRole() != req.role()) changes.add("role " + u.getRole() + " -> " + req.role());
        if (!Objects.equals(u.getSpecialization(), Text.blankToNull(req.specialization()))) changes.add("specialization");
        u.setFullName(req.fullName().trim());
        u.setEmail(email);
        u.setRole(req.role());
        u.setSpecialization(Text.blankToNull(req.specialization()));
        if (req.newPassword() != null && !req.newPassword().isBlank()) {
            u.setPasswordHash(passwordEncoder.encode(req.newPassword()));
            changes.add("password reset");
        }
        auditService.log("USER_UPDATED", "USER", id, "Updated " + u.getUsername() + ": "
                + (changes.isEmpty() ? "no changes" : String.join(", ", changes)));
        return mapper.user(u);
    }

    @Transactional
    public UserResponse setActive(Long id, boolean active) {
        User u = userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User"));
        if (!active && Objects.equals(id, CurrentUser.get().id())) {
            throw ApiException.badRequest("SELF_DEACTIVATION", "You cannot deactivate your own account.");
        }
        if (!active && u.getRole() == Role.ADMIN && userRepository.countByRoleAndActiveTrue(Role.ADMIN) <= 1) {
            throw ApiException.badRequest("LAST_ADMIN", "At least one active admin account is required.");
        }
        u.setActive(active);
        auditService.log(active ? "USER_ACTIVATED" : "USER_DEACTIVATED", "USER", id, u.getUsername());
        return mapper.user(u);
    }
}
