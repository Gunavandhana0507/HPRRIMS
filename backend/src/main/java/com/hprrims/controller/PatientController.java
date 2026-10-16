package com.hprrims.controller;

import com.hprrims.dto.PageResponse;
import com.hprrims.dto.PatientDtos.*;
import com.hprrims.entity.Gender;
import com.hprrims.service.PatientService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Patients")
@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    @GetMapping
    public PageResponse<PatientResponse> search(@RequestParam(required = false) String q,
                                                @RequestParam(required = false) Gender gender,
                                                @RequestParam(required = false) Integer minAge,
                                                @RequestParam(required = false) Integer maxAge,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "20") int size) {
        return patientService.search(q, gender, minAge, maxAge, Paging.page(page), Paging.size(size));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('STAFF')")
    public PatientResponse create(@Valid @RequestBody PatientRequest req) {
        return patientService.create(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public PatientResponse update(@PathVariable Long id, @Valid @RequestBody PatientRequest req) {
        return patientService.update(id, req);
    }

    @GetMapping("/{id}")
    public PatientProfileResponse profile(@PathVariable Long id) {
        return patientService.profile(id);
    }

    @GetMapping("/{id}/history")
    public PatientHistoryResponse history(@PathVariable Long id) {
        return patientService.history(id);
    }
}
