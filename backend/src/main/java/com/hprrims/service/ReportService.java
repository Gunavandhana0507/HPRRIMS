package com.hprrims.service;

import com.hprrims.entity.*;
import com.hprrims.exception.ApiException;
import com.hprrims.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

/** Builds CSV reports from live database data. */
@Service
@RequiredArgsConstructor
public class ReportService {

    public enum ReportType { ADMISSIONS, READMISSIONS, ICU, PREDICTIONS }

    public record Report(String filename, byte[] content, int rows) {
    }

    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final AdmissionRepository admissionRepository;
    private final IcuRequestRepository requestRepository;
    private final ReadmissionPredictionRepository predictionRepository;
    private final AuditService auditService;

    @Transactional
    public Report generate(ReportType type, LocalDate from, LocalDate to) {
        if (from != null && to != null && to.isBefore(from)) {
            throw ApiException.badRequest("INVALID_RANGE", "The end date must be on or after the start date.");
        }
        LocalDateTime f = from == null ? null : from.atStartOfDay();
        LocalDateTime t = to == null ? null : to.plusDays(1).atStartOfDay();
        StringBuilder sb = new StringBuilder("\uFEFF");
        int rows = switch (type) {
            case ADMISSIONS, READMISSIONS -> admissions(sb, admissionRepository.findForReport(f, t, type == ReportType.READMISSIONS));
            case ICU -> icu(sb, requestRepository.findForReport(f, t));
            case PREDICTIONS -> predictions(sb, predictionRepository.findForReport(f, t));
        };
        String range = (from == null ? "all" : from.toString()) + "_" + (to == null ? LocalDate.now().toString() : to.toString());
        auditService.log("REPORT_GENERATED", "REPORT", type.name(), rows + " rows, range " + range);
        return new Report("hprrims-" + type.name().toLowerCase(Locale.ROOT) + "-" + range + ".csv",
                sb.toString().getBytes(StandardCharsets.UTF_8), rows);
    }

    private int admissions(StringBuilder sb, List<Admission> list) {
        row(sb, "Admission ID", "Patient ID", "Patient name", "Age at admission", "Gender", "Doctor", "Admitted at", "Reason",
                "Ward", "Status", "Readmission", "Days since previous discharge", "Window (days)", "Discharged at",
                "Length of stay (days)", "Prediction status");
        for (Admission a : list) {
            Double los = a.getDischargedAt() == null ? null
                    : Math.round(java.time.Duration.between(a.getAdmittedAt(), a.getDischargedAt()).toMinutes() / 144.0) / 10.0;
            row(sb, a.getId(), a.getPatient().getPatientCode(), a.getPatient().getFullName(),
                    a.getPatient().ageOn(a.getAdmittedAt().toLocalDate()), a.getPatient().getGender(), a.getDoctor().getFullName(),
                    fmt(a.getAdmittedAt()), a.getReason(), a.getWard(), a.getStatus(), a.isReadmission() ? "Yes" : "No",
                    a.getDaysSincePreviousDischarge(), a.getReadmissionWindowDays(), fmt(a.getDischargedAt()), los,
                    a.getPredictionStatus());
        }
        return list.size();
    }

    private int icu(StringBuilder sb, List<IcuRequest> list) {
        row(sb, "Request ID", "Patient ID", "Patient name", "Requested at", "Requested by", "Heart rate", "Systolic BP",
                "Resp. rate", "SpO2", "Temperature", "GCS", "Ventilation", "Comorbidities", "Priority (advisory)",
                "Priority score", "Status", "Bed", "Decided by", "Decided at", "Released at");
        for (IcuRequest r : list) {
            row(sb, r.getId(), r.getAdmission().getPatient().getPatientCode(), r.getAdmission().getPatient().getFullName(),
                    fmt(r.getCreatedAt()), r.getRequestedBy().getFullName(), r.getHeartRate(), r.getSystolicBp(),
                    r.getRespiratoryRate(), r.getSpo2(), r.getTemperature(), r.getGcs(), r.isRequiresVentilation() ? "Yes" : "No",
                    r.getComorbidityCount(), r.getPriorityLevel() == null ? "Unscored" : r.getPriorityLevel(),
                    r.getPriorityScore(), r.getStatus(), r.getBed() == null ? null : r.getBed().getBedNumber(),
                    r.getDecidedBy() == null ? null : r.getDecidedBy().getFullName(), fmt(r.getDecidedAt()), fmt(r.getReleasedAt()));
        }
        return list.size();
    }

    private int predictions(StringBuilder sb, List<ReadmissionPrediction> list) {
        row(sb, "Prediction ID", "Admission ID", "Patient ID", "Patient name", "Doctor", "Probability", "Risk level",
                "Model version", "Trigger", "Created at");
        for (ReadmissionPrediction p : list) {
            Admission a = p.getAdmission();
            row(sb, p.getId(), a.getId(), a.getPatient().getPatientCode(), a.getPatient().getFullName(),
                    a.getDoctor().getFullName(), String.format(Locale.ROOT, "%.3f", p.getProbability()), p.getRiskLevel(),
                    p.getModelVersion(), p.getTriggerSource(), fmt(p.getCreatedAt()));
        }
        return list.size();
    }

    private static String fmt(LocalDateTime t) {
        return t == null ? null : t.format(TS);
    }

    private static void row(StringBuilder sb, Object... cells) {
        for (int i = 0; i < cells.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(escape(cells[i]));
        }
        sb.append("\r\n");
    }

    static String escape(Object o) {
        if (o == null) return "";
        String s = String.valueOf(o);
        if (!s.isEmpty() && "=+-@".indexOf(s.charAt(0)) >= 0 && !s.matches("-?[0-9]+([.][0-9]+)?")) {
            s = "'" + s;
        }
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            s = "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }
}
