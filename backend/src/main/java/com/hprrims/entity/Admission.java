package com.hprrims.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "admissions")
public class Admission extends Timestamped {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private User doctor;

    @Column(name = "admitted_at", nullable = false)
    private LocalDateTime admittedAt;

    @Column(nullable = false, length = 500)
    private String reason;

    @Column(length = 60)
    private String ward;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AdmissionStatus status = AdmissionStatus.ADMITTED;

    @Column(name = "is_readmission", nullable = false)
    private boolean readmission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "previous_admission_id")
    private Admission previousAdmission;

    @Column(name = "days_since_previous_discharge")
    private Integer daysSincePreviousDischarge;

    @Column(name = "readmission_window_days", nullable = false)
    private int readmissionWindowDays;

    @Column(name = "discharged_at")
    private LocalDateTime dischargedAt;

    @Column(name = "discharge_summary", columnDefinition = "TEXT")
    private String dischargeSummary;

    @Column(name = "follow_up_notes", columnDefinition = "TEXT")
    private String followUpNotes;

    @Column(name = "discharge_recorded_at")
    private LocalDateTime dischargeRecordedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "discharged_by")
    private User dischargedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "prediction_status", length = 20)
    private PredictionStatus predictionStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Version
    private long version;

    public boolean isActive() {
        return status == AdmissionStatus.ADMITTED;
    }
}
