package com.hprrims.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "icu_beds")
public class IcuBed extends Timestamped {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bed_number", nullable = false, unique = true, length = 20)
    private String bedNumber;

    @Column(nullable = false, length = 60)
    private String ward;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private IcuBedStatus status = IcuBedStatus.AVAILABLE;

    @Version
    private long version;
}
