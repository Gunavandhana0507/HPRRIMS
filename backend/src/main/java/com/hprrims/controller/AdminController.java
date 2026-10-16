package com.hprrims.controller;

import com.hprrims.dto.AdminDtos.*;
import com.hprrims.dto.PageResponse;
import com.hprrims.exception.ApiException;
import com.hprrims.service.AdminService;
import com.hprrims.service.ReportService;
import com.hprrims.service.SettingsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@Tag(name = "Administration, settings and reports")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final SettingsService settingsService;
    private final ReportService reportService;

    @GetMapping("/admin/audit-logs")
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<AuditLogResponse> auditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return adminService.auditLogs(action, entityType, actor, from, to, Paging.page(page), Paging.size(size));
    }

    @GetMapping("/settings")
    public SettingsResponse settings() {
        return new SettingsResponse(settingsService.readmissionWindowDays(), settingsService.staffDischargeEditHours());
    }

    @PutMapping("/admin/settings/readmission-window")
    @PreAuthorize("hasRole('ADMIN')")
    public SettingsResponse updateWindow(@Valid @RequestBody ReadmissionWindowRequest req) {
        settingsService.updateReadmissionWindow(req.days());
        return settings();
    }

    @GetMapping("/admin/ml-status")
    @PreAuthorize("hasRole('ADMIN')")
    public MlStatusResponse mlStatus() {
        return adminService.mlStatus();
    }

    @GetMapping("/reports/{type}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> report(@PathVariable("type") String typeName,
                                         @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                         @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        ReportService.ReportType type;
        try {
            type = ReportService.ReportType.valueOf(typeName.toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw ApiException.notFound("Report type '" + typeName + "'");
        }
        var report = reportService.generate(type, from, to);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(report.filename()).build().toString())
                .header("X-Row-Count", String.valueOf(report.rows()))
                .contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
                .body(report.content());
    }
}
