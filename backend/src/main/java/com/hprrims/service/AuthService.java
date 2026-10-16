package com.hprrims.service;

import com.hprrims.dto.AuthDtos.CurrentUserResponse;
import com.hprrims.dto.AuthDtos.LoginRequest;
import com.hprrims.dto.AuthDtos.LoginResponse;
import com.hprrims.entity.User;
import com.hprrims.exception.ApiException;
import com.hprrims.repository.UserRepository;
import com.hprrims.security.JwtService;
import com.hprrims.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final AuditService auditService;

    @Transactional
    public LoginResponse login(LoginRequest req) {
        UserPrincipal principal;
        try {
            var auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.username().trim(), req.password()));
            principal = (UserPrincipal) auth.getPrincipal();
        } catch (AuthenticationException e) {
            auditService.logAnonymous(null, req.username(), null, "LOGIN_FAILED", e.getClass().getSimpleName());
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid username or password.");
        }
        User user = userRepository.findById(principal.id()).orElseThrow();
        user.setLastLoginAt(LocalDateTime.now());
        auditService.logAnonymous(user.getId(), user.getUsername(), user.getRole().name(), "LOGIN", "Signed in");
        var token = jwtService.issue(principal);
        return new LoginResponse(token.token(), token.expiresAt(), toCurrent(user));
    }

    @Transactional(readOnly = true)
    public CurrentUserResponse me(Long userId) {
        return toCurrent(userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User")));
    }

    private static CurrentUserResponse toCurrent(User u) {
        return new CurrentUserResponse(u.getId(), u.getUsername(), u.getFullName(), u.getRole(), u.getSpecialization());
    }
}
