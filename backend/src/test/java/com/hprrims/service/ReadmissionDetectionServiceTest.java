package com.hprrims.service;

import com.hprrims.entity.Admission;
import com.hprrims.exception.ApiException;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class ReadmissionDetectionServiceTest {

    private static Admission dischargedAt(LocalDateTime t) {
        Admission a = new Admission();
        a.setDischargedAt(t);
        return a;
    }

    @Test
    void flagsAdmissionInsideWindow() {
        var r = ReadmissionDetectionService.evaluate(dischargedAt(LocalDateTime.of(2026, 10, 1, 10, 0)),
                LocalDateTime.of(2026, 10, 20, 9, 0), 30);
        assertTrue(r.readmission());
        assertEquals(19, r.daysSinceDischarge());
    }

    @Test
    void windowBoundaryIsInclusive() {
        var prev = dischargedAt(LocalDateTime.of(2026, 9, 1, 23, 0));
        assertTrue(ReadmissionDetectionService.evaluate(prev, LocalDateTime.of(2026, 10, 1, 1, 0), 30).readmission());
        assertFalse(ReadmissionDetectionService.evaluate(prev, LocalDateTime.of(2026, 10, 2, 1, 0), 30).readmission());
    }

    @Test
    void respectsConfiguredWindow() {
        var prev = dischargedAt(LocalDateTime.of(2026, 10, 1, 10, 0));
        assertFalse(ReadmissionDetectionService.evaluate(prev, LocalDateTime.of(2026, 10, 20, 9, 0), 14).readmission());
    }

    @Test
    void rejectsAdmissionBeforePreviousDischarge() {
        var prev = dischargedAt(LocalDateTime.of(2026, 10, 1, 10, 0));
        assertThrows(ApiException.class,
                () -> ReadmissionDetectionService.evaluate(prev, LocalDateTime.of(2026, 10, 1, 9, 0), 30));
    }
}
