package com.hprrims.controller;

import com.hprrims.dto.IcuDtos.*;
import com.hprrims.dto.PageResponse;
import com.hprrims.entity.IcuRequestStatus;
import com.hprrims.service.IcuService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "ICU beds and allocation")
@RestController
@RequestMapping("/api/icu")
@RequiredArgsConstructor
public class IcuController {

    private final IcuService icuService;

    @GetMapping("/beds")
    public List<BedResponse> beds() {
        return icuService.beds();
    }

    @PostMapping("/beds")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public BedResponse createBed(@Valid @RequestBody BedRequest req) {
        return icuService.createBed(req);
    }

    @PatchMapping("/beds/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public BedResponse bedStatus(@PathVariable Long id, @Valid @RequestBody BedStatusRequest req) {
        return icuService.setBedStatus(id, req);
    }

    @GetMapping("/requests")
    public PageResponse<IcuRequestResponse> requests(@RequestParam(required = false) IcuRequestStatus status,
                                                     @RequestParam(required = false) String q,
                                                     @RequestParam(defaultValue = "0") int page,
                                                     @RequestParam(defaultValue = "20") int size) {
        return icuService.requests(status, q, Paging.page(page), Paging.size(size));
    }

    @GetMapping("/requests/{id}")
    public IcuRequestResponse get(@PathVariable Long id) {
        return icuService.get(id);
    }

    @PostMapping("/requests")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('STAFF')")
    public IcuRequestResponse create(@Valid @RequestBody CreateIcuRequest req) {
        return icuService.create(req);
    }

    @PostMapping("/requests/{id}/rescore")
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public IcuRequestResponse rescore(@PathVariable Long id) {
        return icuService.rescore(id);
    }

    @PostMapping("/requests/{id}/allocate")
    @PreAuthorize("hasRole('ADMIN')")
    public IcuRequestResponse allocate(@PathVariable Long id, @Valid @RequestBody AllocateRequest req) {
        return icuService.allocate(id, req);
    }

    @PostMapping("/requests/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public IcuRequestResponse reject(@PathVariable Long id, @Valid @RequestBody DecisionRequest req) {
        return icuService.reject(id, req);
    }

    @PostMapping("/requests/{id}/cancel")
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public IcuRequestResponse cancel(@PathVariable Long id, @Valid @RequestBody(required = false) DecisionRequest req) {
        return icuService.cancel(id, req);
    }

    @PostMapping("/requests/{id}/release")
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public IcuRequestResponse release(@PathVariable Long id) {
        return icuService.release(id);
    }
}
