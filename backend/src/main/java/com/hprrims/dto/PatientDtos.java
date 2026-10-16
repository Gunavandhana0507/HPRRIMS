package com.hprrims.dto;

import com.hprrims.entity.AdmissionStatus;
import com.hprrims.entity.Gender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class PatientDtos {

    private PatientDtos() {
    }

    public static final String PHONE = "^[+]?[0-9][0-9 -]{6,18}[0-9]$";

    public record PatientRequest(
            @NotBlank(message = "Full name is required") @Size(min = 2, max = 120, message = "Name must be 2-120 characters")
            @Pattern(regexp = "^[A-Za-zÀ-ɏ .'-]+$", message = "Name can contain letters, spaces, dots, apostrophes and hyphens")
            String fullName,
            @NotNull(message = "Date of birth is required") @Past(message = "Date of birth must be in the past")
            LocalDate dateOfBirth,
            @NotNull(message = "Gender is required") Gender gender,
            @NotBlank(message = "Contact number is required") @Pattern(regexp = PHONE, message = "Enter a valid phone number")
            String contactNumber,
            @Email(message = "Enter a valid email address") @Size(max = 120) String email,
            @Size(max = 255) String address,
            @Size(max = 120) String emergencyContactName,
            @Pattern(regexp = PHONE, message = "Enter a valid phone number") String emergencyContactNumber,
            @Size(max = 500) String correctionReason) {
    }

    public record PatientResponse(Long id, String patientCode, String fullName, LocalDate dateOfBirth, int age,
                                  Gender gender, String contactNumber, String email, String address,
                                  String emergencyContactName, String emergencyContactNumber,
                                  LocalDateTime registeredAt, String registeredBy,
                                  AdmissionStatus currentAdmissionStatus, Long activeAdmissionId) {
    }

    public record PatientProfileResponse(PatientResponse patient,
                                         AdmissionDtos.AdmissionResponse activeAdmission,
                                         List<AdmissionDtos.AdmissionResponse> previousAdmissions,
                                         long readmissionCount,
                                         List<PredictionDtos.PredictionResponse> predictions,
                                         List<IcuDtos.IcuRequestResponse> icuRequests,
                                         boolean medicalRecordsVisible) {
    }

    public record HistoryEntry(AdmissionDtos.AdmissionResponse admission,
                               List<MedicalRecordDtos.RecordResponse> records,
                               List<PredictionDtos.PredictionResponse> predictions,
                               boolean current) {
    }

    public record PatientHistoryResponse(PatientResponse patient, List<HistoryEntry> entries,
                                         boolean medicalRecordsVisible) {
    }
}
