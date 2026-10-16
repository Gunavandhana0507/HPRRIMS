package com.hprrims.controller;

import com.hprrims.dto.DashboardDtos.*;
import com.hprrims.service.DashboardService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Dashboards")
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public AdminDashboard admin() {
        return dashboardService.admin();
    }

    @GetMapping("/doctor")
    @PreAuthorize("hasRole('DOCTOR')")
    public DoctorDashboard doctor() {
        return dashboardService.doctor();
    }

    @GetMapping("/staff")
    @PreAuthorize("hasRole('STAFF')")
    public StaffDashboard staff() {
        return dashboardService.staff();
    }
}
