package com.hprrims.dto;

import com.hprrims.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class UserDtos {

    private UserDtos() {
    }

    public static final String PASSWORD_RULE = "^(?=.*[A-Za-z])(?=.*[0-9]).{8,100}$";
    public static final String PASSWORD_MESSAGE = "Password must be at least 8 characters and include a letter and a number";

    public record CreateUserRequest(
            @NotBlank(message = "Username is required")
            @Pattern(regexp = "^[a-zA-Z0-9._-]{3,50}$", message = "Use 3-50 letters, numbers, dots, dashes or underscores")
            String username,
            @NotBlank(message = "Password is required") @Pattern(regexp = PASSWORD_RULE, message = PASSWORD_MESSAGE)
            String password,
            @NotBlank(message = "Full name is required") @Size(max = 120) String fullName,
            @Email(message = "Enter a valid email address") @Size(max = 120) String email,
            @NotNull(message = "Role is required") Role role,
            @Size(max = 100) String specialization) {
    }

    public record UpdateUserRequest(
            @NotBlank(message = "Full name is required") @Size(max = 120) String fullName,
            @Email(message = "Enter a valid email address") @Size(max = 120) String email,
            @NotNull(message = "Role is required") Role role,
            @Size(max = 100) String specialization,
            @Pattern(regexp = PASSWORD_RULE, message = PASSWORD_MESSAGE) String newPassword) {
    }

    public record UserStatusRequest(@NotNull(message = "Active flag is required") Boolean active) {
    }

    public record UserResponse(Long id, String username, String fullName, String email, Role role,
                               String specialization, boolean active, LocalDateTime lastLoginAt,
                               LocalDateTime createdAt) {
    }

    public record DoctorOption(Long id, String fullName, String specialization) {
    }
}
