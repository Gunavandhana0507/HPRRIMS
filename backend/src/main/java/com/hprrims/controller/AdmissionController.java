package com.hprrims.controller;

import com.hprrims.dto.AdmissionDtos.*;
import com.hprrims.dto.MedicalRecordDtos.*;
import com.hprrims.dto.PageResponse;
import com.hprrims.dto.PredictionDtos.PredictionOutcome;
import com.hprrims.dto.PredictionDtos.PredictionResponse;
import com.hprrims.entity.AdmissionStatus;
import com.hprrims.entity.Role;
import com.hprrims.security.CurrentUser;
import com.hprrims.service.AdmissionService;
import com.hprrims.service.MedicalRecordService;
import com.hprrims.service.PredictionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Tag(name = "Admissions, discharges, medical records and predictions")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AdmissionController {

    private final AdmissionService admissionService;
    private final MedicalRecordService recordService;
    private final PredictionService predictionService;

    @GetMapping("/admissions")
    public PageResponse<AdmissionResponse> search(
            @RequestParam(required = false) AdmissionStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean readmission,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var me = CurrentUser.get();
        Long doctorId = mine && me.role() == Role.DOCTOR ? me.id() : null;
        return admissionService.search(status, from, to, q, doctorId, readmission, Paging.page(page), Paging.size(size));
    }

    @PostMapping("/admissions")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('STAFF')")
    public AdmissionResponse create(@Valid @RequestBody CreateAdmissionRequest req) {
        return admissionService.create(req);
    }

    @GetMapping("/admissions/{id}")
    public AdmissionResponse get(@PathVariable Long id) {
        return admissionService.get(id);
    }

    @PatchMapping("/admissions/{id}/doctor")
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public AdmissionResponse reassign(@PathVariable Long id, @Valid @RequestBody ReassignDoctorRequest req) {
        return admissionService.reassignDoctor(id, req);
    }

    @PostMapping("/admissions/{id}/discharge")
    @PreAuthorize("hasRole('STAFF')")
    public DischargeResponse discharge(@PathVariable Long id, @Valid @RequestBody DischargeRequest req) {
        return admissionService.discharge(id, req);
    }

    @PutMapping("/admissions/{id}/discharge")
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public AdmissionResponse updateDischarge(@PathVariable Long id, @Valid @RequestBody DischargeUpdateRequest req) {
        return admissionService.updateDischarge(id, req);
    }

    @GetMapping("/predictions")
    @PreAuthorize("hasAnyRole('DOCTOR','ADMIN')")
    public com.hprrims.dto.PageResponse<PredictionResponse> latestPredictions(
            @RequestParam(required = false) com.hprrims.entity.RiskLevel riskLevel,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return predictionService.latest(riskLevel, mine, page, size);
    }

    @GetMapping("/admissions/{id}/predictions")
    public List<PredictionResponse> predictions(@PathVariable Long id) {
        return predictionService.forAdmission(id);
    }

    @PostMapping("/admissions/{id}/predictions")
    @PreAuthorize("hasAnyRole('DOCTOR','STAFF','ADMIN')")
    public PredictionOutcome predict(@PathVariable Long id, @RequestParam(defaultValue = "false") boolean retry) {
        boolean asRetry = retry || CurrentUser.get().role() != Role.DOCTOR;
        return admissionService.requestPrediction(id, asRetry);
    }

    @GetMapping("/admissions/{id}/records")
    @PreAuthorize("hasAnyRole('DOCTOR','ADMIN')")
    public List<RecordResponse> records(@PathVariable Long id) {
        return recordService.list(id);
    }

    @PostMapping("/admissions/{id}/records")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('DOCTOR')")
    public RecordResponse addRecord(@PathVariable Long id, @Valid @RequestBody RecordRequest req) {
        return recordService.create(id, req);
    }

    @PutMapping("/records/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR','ADMIN')")
    public RecordResponse correct(@PathVariable Long id, @Valid @RequestBody CorrectionRequest req) {
        return recordService.correct(id, req);
    }

    @GetMapping("/records/{id}/revisions")
    @PreAuthorize("hasAnyRole('DOCTOR','ADMIN')")
    public List<RevisionResponse> revisions(@PathVariable Long id) {
        return recordService.revisions(id);
    }
}
