package com.hprrims.service;

import com.hprrims.entity.Admission;
import com.hprrims.entity.AdmissionStatus;
import com.hprrims.exception.ApiException;
import com.hprrims.repository.AdmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

/**
 * Rule-based 30-day (configurable) readmission check. Compares a new admission date with the patient's
 * most recent discharge using calendar days.
 */
@Service
@RequiredArgsConstructor
public class ReadmissionDetectionService {

    private final AdmissionRepository admissionRepository;

    public record Result(boolean readmission, Admission previousAdmission, Integer daysSinceDischarge, int windowDays) {
    }

    public Result evaluate(Long patientId, LocalDateTime admittedAt, int windowDays) {
        Optional<Admission> last = admissionRepository
                .findFirstByPatientIdAndStatusAndDischargedAtNotNullOrderByDischargedAtDesc(patientId, AdmissionStatus.DISCHARGED);
        if (last.isEmpty()) {
            return new Result(false, null, null, windowDays);
        }
        return evaluate(last.get(), admittedAt, windowDays);
    }

    public static Result evaluate(Admission previous, LocalDateTime admittedAt, int windowDays) {
        if (admittedAt.isBefore(previous.getDischargedAt())) {
            throw ApiException.badRequest("ADMISSION_BEFORE_PREVIOUS_DISCHARGE",
                    "The admission date is before this patient's last discharge (" + previous.getDischargedAt() + ").");
        }
        long days = ChronoUnit.DAYS.between(previous.getDischargedAt().toLocalDate(), admittedAt.toLocalDate());
        return new Result(days <= windowDays, previous, (int) days, windowDays);
    }
}
