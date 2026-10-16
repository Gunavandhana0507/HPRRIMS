package com.hprrims.service;

import com.hprrims.dto.DashboardDtos.*;
import com.hprrims.entity.*;
import com.hprrims.repository.*;
import com.hprrims.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final int MONTHS = 12;

    private final PatientRepository patientRepository;
    private final AdmissionRepository admissionRepository;
    private final IcuBedRepository bedRepository;
    private final IcuRequestRepository requestRepository;
    private final ReadmissionPredictionRepository predictionRepository;
    private final MedicalRecordRepository recordRepository;
    private final DtoMapper mapper;

    @Transactional(readOnly = true)
    public AdminDashboard admin() {
        long total = admissionRepository.count();
        long active = admissionRepository.countByStatus(AdmissionStatus.ADMITTED);
        long discharged = admissionRepository.countByStatus(AdmissionStatus.DISCHARGED);
        long readmissions = admissionRepository.countByReadmissionTrue();
        double rate = total == 0 ? 0 : Math.round(readmissions * 1000.0 / total) / 10.0;
        long beds = bedRepository.count();
        long available = bedRepository.countByStatus(IcuBedStatus.AVAILABLE);
        long occupied = bedRepository.countByStatus(IcuBedStatus.OCCUPIED);
        long maintenance = bedRepository.countByStatus(IcuBedStatus.MAINTENANCE);
        return new AdminDashboard(patientRepository.count(), total, active, discharged, readmissions, rate, beds,
                available, occupied, maintenance, requestRepository.countByStatus(IcuRequestStatus.PENDING), monthly(),
                List.of(new NameValue("Admitted", active), new NameValue("Discharged", discharged)),
                List.of(new NameValue("Available", available), new NameValue("Occupied", occupied),
                        new NameValue("Maintenance", maintenance)),
                riskDistribution(null), priorityDistribution(), predictionRepository.count());
    }

    @Transactional(readOnly = true)
    public DoctorDashboard doctor() {
        Long me = CurrentUser.get().id();
        var active = admissionRepository.findByDoctorIdAndStatusOrderByAdmittedAtDesc(me, AdmissionStatus.ADMITTED);
        return new DoctorDashboard(active.size(), active.stream().map(mapper::admission).toList(),
                recordRepository.findByDoctorIdOrderByCreatedAtDesc(me, PageRequest.of(0, 8)).stream().map(mapper::record).toList(),
                predictionRepository.findLatestPerAdmission(me, PageRequest.of(0, 10)).stream().map(mapper::prediction).toList(),
                riskDistribution(me));
    }

    @Transactional(readOnly = true)
    public StaffDashboard staff() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = start.plusDays(1);
        var admitted = admissionRepository.findByAdmittedAtBetweenOrderByAdmittedAtDesc(start, end);
        var discharged = admissionRepository.findByDischargedAtBetweenOrderByDischargedAtDesc(start, end);
        return new StaffDashboard(patientRepository.count(), admissionRepository.countByStatus(AdmissionStatus.ADMITTED),
                admitted.size(), discharged.size(), requestRepository.countByStatus(IcuRequestStatus.PENDING),
                bedRepository.countByStatus(IcuBedStatus.AVAILABLE),
                admitted.stream().map(mapper::admission).toList(), discharged.stream().map(mapper::admission).toList());
    }

    private List<SeriesPoint> monthly() {
        YearMonth first = YearMonth.now().minusMonths(MONTHS - 1L);
        Map<String, long[]> byMonth = new LinkedHashMap<>();
        for (int i = 0; i < MONTHS; i++) {
            byMonth.put(first.plusMonths(i).toString(), new long[2]);
        }
        for (Object[] row : admissionRepository.monthlyAdmissionStats(first.atDay(1).atStartOfDay())) {
            long[] v = byMonth.get(String.valueOf(row[0]));
            if (v != null) {
                v[0] = row[1] == null ? 0 : ((Number) row[1]).longValue();
                v[1] = row[2] == null ? 0 : ((Number) row[2]).longValue();
            }
        }
        List<SeriesPoint> out = new ArrayList<>();
        byMonth.forEach((k, v) -> out.add(new SeriesPoint(k, v[0], v[1])));
        return out;
    }

    private List<NameValue> riskDistribution(Long doctorId) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (RiskLevel r : RiskLevel.values()) counts.put(r.name(), 0L);
        for (Object[] row : predictionRepository.latestRiskDistribution(doctorId)) {
            counts.put(String.valueOf(row[0]), ((Number) row[1]).longValue());
        }
        return counts.entrySet().stream().map(e -> new NameValue(e.getKey(), e.getValue())).toList();
    }

    private List<NameValue> priorityDistribution() {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (IcuPriority p : IcuPriority.values()) counts.put(p.name(), 0L);
        for (Object[] row : requestRepository.priorityDistribution()) {
            counts.put(String.valueOf(row[0]), ((Number) row[1]).longValue());
        }
        return counts.entrySet().stream().map(e -> new NameValue(e.getKey(), e.getValue())).toList();
    }
}
