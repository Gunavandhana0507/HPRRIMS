package com.hprrims.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.hprrims.dto.IcuDtos.*;
import com.hprrims.dto.PageResponse;
import com.hprrims.entity.*;
import com.hprrims.exception.ApiException;
import com.hprrims.repository.*;
import com.hprrims.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IcuService {

    private static final List<IcuRequestStatus> OPEN = List.of(IcuRequestStatus.PENDING, IcuRequestStatus.ALLOCATED);

    private final IcuBedRepository bedRepository;
    private final IcuRequestRepository requestRepository;
    private final AdmissionRepository admissionRepository;
    private final UserRepository userRepository;
    private final MlClient mlClient;
    private final AuditService auditService;
    private final DtoMapper mapper;

    @Transactional(readOnly = true)
    public List<BedResponse> beds() {
        List<IcuBed> beds = bedRepository.findAllByOrderByWardAscBedNumberAsc();
        Map<Long, IcuRequest> current = beds.isEmpty() ? Map.of() : requestRepository
                .findByStatusAndBedIdIn(IcuRequestStatus.ALLOCATED, beds.stream().map(IcuBed::getId).toList()).stream()
                .collect(Collectors.toMap(r -> r.getBed().getId(), Function.identity(), (a, b) -> a));
        return beds.stream().map(b -> mapper.bed(b, current.get(b.getId()))).toList();
    }

    @Transactional
    public BedResponse createBed(BedRequest req) {
        String number = req.bedNumber().trim().toUpperCase(Locale.ROOT);
        if (bedRepository.existsByBedNumberIgnoreCase(number)) {
            throw ApiException.conflict("BED_EXISTS", "A bed with that number already exists.");
        }
        IcuBed b = new IcuBed();
        b.setBedNumber(number);
        b.setWard(req.ward().trim());
        b.setStatus(IcuBedStatus.AVAILABLE);
        bedRepository.save(b);
        auditService.log("ICU_BED_CREATED", "ICU_BED", b.getId(), number + " in " + b.getWard());
        return mapper.bed(b, null);
    }

    @Transactional
    public BedResponse setBedStatus(Long id, BedStatusRequest req) {
        IcuBed b = bedRepository.findByIdForUpdate(id).orElseThrow(() -> ApiException.notFound("ICU bed"));
        if (req.status() == IcuBedStatus.OCCUPIED) {
            throw ApiException.badRequest("USE_ALLOCATION", "Beds become occupied only through an ICU allocation.");
        }
        if (b.getStatus() == IcuBedStatus.OCCUPIED) {
            throw ApiException.conflict("BED_OCCUPIED", "Release the current allocation before changing this bed.");
        }
        IcuBedStatus previous = b.getStatus();
        b.setStatus(req.status());
        auditService.log("ICU_BED_STATUS", "ICU_BED", id, b.getBedNumber() + ": " + previous + " -> " + req.status());
        return mapper.bed(b, null);
    }

    @Transactional(readOnly = true)
    public PageResponse<IcuRequestResponse> requests(IcuRequestStatus status, String q, int page, int size) {
        var result = requestRepository.search(status, Text.like(q), PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return PageResponse.of(result, mapper::icuRequest);
    }

    @Transactional(readOnly = true)
    public IcuRequestResponse get(Long id) {
        return mapper.icuRequest(load(id));
    }

    @Transactional
    public IcuRequestResponse create(CreateIcuRequest req) {
        Admission a = admissionRepository.findDetailedById(req.admissionId()).orElseThrow(() -> ApiException.notFound("Admission"));
        if (!a.isActive()) {
            throw ApiException.badRequest("ADMISSION_NOT_ACTIVE", "ICU requests can only be made for active admissions.");
        }
        if (requestRepository.existsByAdmissionIdAndStatusIn(a.getId(), OPEN)) {
            throw ApiException.conflict("OPEN_ICU_REQUEST", "This admission already has a pending or allocated ICU request.");
        }
        IcuRequest r = new IcuRequest();
        r.setAdmission(a);
        r.setRequestedBy(userRepository.getReferenceById(CurrentUser.get().id()));
        r.setHeartRate(req.heartRate());
        r.setSystolicBp(req.systolicBp());
        r.setRespiratoryRate(req.respiratoryRate());
        r.setSpo2(req.spo2());
        r.setTemperature(req.temperature());
        r.setGcs(req.gcs());
        r.setRequiresVentilation(req.requiresVentilation());
        r.setComorbidityCount(req.comorbidityCount());
        r.setClinicalNotes(Text.blankToNull(req.clinicalNotes()));
        r.setStatus(IcuRequestStatus.PENDING);
        score(r);
        requestRepository.saveAndFlush(r);
        auditService.log("ICU_REQUEST_CREATED", "ICU_REQUEST", r.getId(), a.getPatient().getPatientCode() + " priority "
                + (r.getPriorityLevel() == null ? "unscored (ML unavailable)" : r.getPriorityLevel()));
        return get(r.getId());
    }

    @Transactional
    public IcuRequestResponse rescore(Long id) {
        IcuRequest r = load(id);
        requirePending(r);
        score(r);
        auditService.log("ICU_REQUEST_RESCORED", "ICU_REQUEST", id, "Scoring " + r.getScoringStatus());
        return mapper.icuRequest(r);
    }

    @Transactional
    public IcuRequestResponse allocate(Long id, AllocateRequest req) {
        IcuRequest r = load(id);
        requirePending(r);
        if (!r.getAdmission().isActive()) {
            throw ApiException.badRequest("ADMISSION_NOT_ACTIVE", "The patient's admission is no longer active.");
        }
        IcuBed bed = bedRepository.findByIdForUpdate(req.bedId()).orElseThrow(() -> ApiException.notFound("ICU bed"));
        if (bed.getStatus() != IcuBedStatus.AVAILABLE) {
            throw ApiException.conflict("BED_NOT_AVAILABLE", "Bed " + bed.getBedNumber() + " is " + bed.getStatus().name().toLowerCase() + ".");
        }
        bed.setStatus(IcuBedStatus.OCCUPIED);
        r.setBed(bed);
        r.setStatus(IcuRequestStatus.ALLOCATED);
        decide(r, req.notes());
        requestRepository.saveAndFlush(r);
        auditService.log("ICU_BED_ALLOCATED", "ICU_REQUEST", id, "Bed " + bed.getBedNumber() + " to "
                + r.getAdmission().getPatient().getPatientCode() + " (priority " + r.getPriorityLevel() + ")");
        return mapper.icuRequest(r);
    }

    @Transactional
    public IcuRequestResponse reject(Long id, DecisionRequest req) {
        IcuRequest r = load(id);
        requirePending(r);
        if (req == null || Text.blankToNull(req.notes()) == null) {
            throw ApiException.badRequest("REASON_REQUIRED", "Enter a reason for rejecting the request.");
        }
        r.setStatus(IcuRequestStatus.REJECTED);
        decide(r, req.notes());
        auditService.log("ICU_REQUEST_REJECTED", "ICU_REQUEST", id, "Rejected", req.notes().trim());
        return mapper.icuRequest(r);
    }

    @Transactional
    public IcuRequestResponse cancel(Long id, DecisionRequest req) {
        IcuRequest r = load(id);
        requirePending(r);
        r.setStatus(IcuRequestStatus.CANCELLED);
        decide(r, req == null ? null : req.notes());
        auditService.log("ICU_REQUEST_CANCELLED", "ICU_REQUEST", id, "Cancelled");
        return mapper.icuRequest(r);
    }

    @Transactional
    public IcuRequestResponse release(Long id) {
        IcuRequest r = load(id);
        if (r.getStatus() != IcuRequestStatus.ALLOCATED) {
            throw ApiException.conflict("NOT_ALLOCATED", "Only allocated requests can be released.");
        }
        IcuBed bed = bedRepository.findByIdForUpdate(r.getBed().getId()).orElseThrow();
        bed.setStatus(IcuBedStatus.AVAILABLE);
        r.setStatus(IcuRequestStatus.RELEASED);
        r.setReleasedAt(LocalDateTime.now());
        auditService.log("ICU_BED_RELEASED", "ICU_REQUEST", id, "Bed " + bed.getBedNumber() + " released");
        return mapper.icuRequest(r);
    }

    public void score(IcuRequest r) {
        Map<String, Object> f = new LinkedHashMap<>();
        Patient p = r.getAdmission().getPatient();
        f.put("age", Math.min(120, p.currentAge()));
        f.put("heart_rate", r.getHeartRate());
        f.put("systolic_bp", r.getSystolicBp());
        f.put("respiratory_rate", r.getRespiratoryRate());
        f.put("spo2", r.getSpo2());
        f.put("temperature", r.getTemperature());
        f.put("gcs", r.getGcs());
        f.put("requires_ventilation", r.isRequiresVentilation());
        f.put("comorbidity_count", r.getComorbidityCount());
        try {
            JsonNode res = mlClient.predictIcuPriority(f);
            r.setPriorityLevel(IcuPriority.valueOf(res.path("priority_level").asText()));
            r.setPriorityScore(res.path("priority_score").asDouble());
            r.setClassProbabilities(res.path("class_probabilities").toString());
            r.setModelVersion(res.path("model_version").asText("unknown"));
            r.setScoringStatus(ScoringStatus.SCORED);
        } catch (MlClient.MlUnavailableException | IllegalArgumentException e) {
            r.setScoringStatus(ScoringStatus.UNAVAILABLE);
        }
    }

    private void decide(IcuRequest r, String notes) {
        r.setDecidedBy(userRepository.getReferenceById(CurrentUser.get().id()));
        r.setDecidedAt(LocalDateTime.now());
        r.setDecisionNotes(Text.blankToNull(notes));
    }

    private static void requirePending(IcuRequest r) {
        if (r.getStatus() != IcuRequestStatus.PENDING) {
            throw ApiException.conflict("REQUEST_NOT_PENDING", "This request is already " + r.getStatus().name().toLowerCase() + ".");
        }
    }

    private IcuRequest load(Long id) {
        return requestRepository.findDetailedById(id).orElseThrow(() -> ApiException.notFound("ICU request"));
    }
}
