package com.hprrims.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hprrims.exception.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/** Writes JSON 401/403 bodies so the frontend can distinguish expired sessions from missing permissions. */
@Component
@RequiredArgsConstructor
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest req, HttpServletResponse res, AuthenticationException ex) throws IOException {
        Object attr = req.getAttribute(JwtAuthenticationFilter.AUTH_ERROR_ATTR);
        String code = attr == null ? "AUTHENTICATION_REQUIRED" : attr.toString();
        String message = switch (code) {
            case "TOKEN_EXPIRED" -> "Your session has expired. Sign in again.";
            case "ACCOUNT_DISABLED" -> "This account has been deactivated.";
            case "TOKEN_INVALID" -> "Your session is not valid. Sign in again.";
            default -> "Sign in to continue.";
        };
        write(res, ErrorResponse.of(401, "Unauthorized", code, message, req.getRequestURI()));
    }

    @Override
    public void handle(HttpServletRequest req, HttpServletResponse res, AccessDeniedException ex) throws IOException {
        write(res, ErrorResponse.of(403, "Forbidden", "FORBIDDEN",
                "You do not have permission to perform this action.", req.getRequestURI()));
    }

    private void write(HttpServletResponse res, ErrorResponse body) throws IOException {
        res.setStatus(body.status());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(res.getOutputStream(), body);
    }
}
