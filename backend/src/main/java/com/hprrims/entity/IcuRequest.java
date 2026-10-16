package com.hprrims.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "icu_requests")
public class IcuRequest extends Timestamped {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "admission_id", nullable = false)
    private Admission admission;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requested_by", nullable = false)
    private User requestedBy;

    @Column(name = "heart_rate", nullable = false)
    private int heartRate;

    @Column(name = "systolic_bp", nullable = false)
    private int systolicBp;

    @Column(name = "respiratory_rate", nullable = false)
    private int respiratoryRate;

    @Column(nullable = false)
    private int spo2;

    @Column(nullable = false)
    private double temperature;

    @Column(nullable = false)
    private int gcs;

    @Column(name = "requires_ventilation", nullable = false)
    private boolean requiresVentilation;

    @Column(name = "comorbidity_count", nullable = false)
    private int comorbidityCount;

    @Column(name = "clinical_notes", columnDefinition = "TEXT")
    private String clinicalNotes;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority_level", length = 10)
    private IcuPriority priorityLevel;

    @Column(name = "priority_score")
    private Double priorityScore;

    @Column(name = "class_probabilities", columnDefinition = "TEXT")
    private String classProbabilities;

    @Column(name = "model_version", length = 50)
    private String modelVersion;

    @Enumerated(EnumType.STRING)
    @Column(name = "scoring_status", nullable = false, length = 20)
    private ScoringStatus scoringStatus = ScoringStatus.UNAVAILABLE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private IcuRequestStatus status = IcuRequestStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bed_id")
    private IcuBed bed;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_by")
    private User decidedBy;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @Column(name = "decision_notes", length = 500)
    private String decisionNotes;

    @Column(name = "released_at")
    private LocalDateTime releasedAt;

    @Version
    private long version;
}
