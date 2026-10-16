package com.hprrims.dto;

import java.util.List;

public final class DashboardDtos {

    private DashboardDtos() {
    }

    public record NameValue(String name, long value) {
    }

    public record SeriesPoint(String period, long admissions, long readmissions) {
    }

    public record AdminDashboard(long totalPatients, long totalAdmissions, long activeAdmissions,
                                 long dischargedAdmissions, long totalReadmissions, double readmissionRate,
                                 long totalIcuBeds, long availableIcuBeds, long occupiedIcuBeds,
                                 long maintenanceIcuBeds, long pendingIcuRequests,
                                 List<SeriesPoint> monthly, List<NameValue> statusDistribution,
                                 List<NameValue> icuUtilization, List<NameValue> riskDistribution,
                                 List<NameValue> icuPriorityDistribution, long totalPredictions) {
    }

    public record DoctorDashboard(long assignedActiveCount,
                                  List<AdmissionDtos.AdmissionResponse> assignedActiveAdmissions,
                                  List<MedicalRecordDtos.RecordResponse> recentRecords,
                                  List<PredictionDtos.PredictionResponse> recentPredictions,
                                  List<NameValue> riskDistribution) {
    }

    public record StaffDashboard(long totalPatients, long activeAdmissions, long todaysAdmissions,
                                 long todaysDischarges, long pendingIcuRequests, long availableIcuBeds,
                                 List<AdmissionDtos.AdmissionResponse> todaysAdmissionList,
                                 List<AdmissionDtos.AdmissionResponse> todaysDischargeList) {
    }
}
