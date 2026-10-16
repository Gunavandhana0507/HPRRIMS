package com.hprrims.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.Period;

@Getter
@Setter
@Entity
@Table(name = "patients")
public class Patient extends Timestamped {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_code", nullable = false, unique = true, length = 20)
    private String patientCode;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(name = "date_of_birth", nullable = false)
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Gender gender;

    @Column(name = "contact_number", nullable = false, length = 20)
    private String contactNumber;

    @Column(length = 120)
    private String email;

    @Column(length = 255)
    private String address;

    @Column(name = "emergency_contact_name", length = 120)
    private String emergencyContactName;

    @Column(name = "emergency_contact_number", length = 20)
    private String emergencyContactNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    /** Age in completed years on the given date. Single age strategy used across the system. */
    public int ageOn(LocalDate date) {
        return Math.max(0, Period.between(dateOfBirth, date).getYears());
    }

    public int currentAge() {
        return ageOn(LocalDate.now());
    }
}
