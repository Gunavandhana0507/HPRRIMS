package com.hprrims.dto;

import com.hprrims.entity.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
            @NotBlank(message = "Enter your username") @Size(max = 50) String username,
            @NotBlank(message = "Enter your password") @Size(max = 100) String password) {
    }

    public record CurrentUserResponse(Long id, String username, String fullName, Role role, String specialization) {
    }

    public record LoginResponse(String token, Instant expiresAt, CurrentUserResponse user) {
    }
}
