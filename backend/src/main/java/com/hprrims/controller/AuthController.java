package com.hprrims.controller;

import com.hprrims.dto.AuthDtos.CurrentUserResponse;
import com.hprrims.dto.AuthDtos.LoginRequest;
import com.hprrims.dto.AuthDtos.LoginResponse;
import com.hprrims.security.CurrentUser;
import com.hprrims.service.AuditService;
import com.hprrims.service.AuthService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Authentication")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuditService auditService;

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @GetMapping("/me")
    public CurrentUserResponse me() {
        return authService.me(CurrentUser.get().id());
    }

    /** JWTs are stateless; the client discards its token. The call records the sign-out. */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        auditService.log("LOGOUT", "AUTH", CurrentUser.get().id(), "Signed out");
        return ResponseEntity.noContent().build();
    }
}
