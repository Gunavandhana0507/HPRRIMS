package com.hprrims.service;

import com.hprrims.entity.SystemSetting;
import com.hprrims.repository.SystemSettingRepository;
import com.hprrims.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class SettingsService {

    public static final String READMISSION_WINDOW = "readmission.window.days";

    private final SystemSettingRepository repository;
    private final AuditService auditService;

    @Value("${app.readmission.default-window-days}")
    private int defaultWindowDays;

    @Value("${app.discharge.staff-edit-window-hours}")
    private int staffEditHours;

    @Transactional(readOnly = true)
    public int readmissionWindowDays() {
        return repository.findById(READMISSION_WINDOW).map(s -> Integer.parseInt(s.getValue())).orElse(defaultWindowDays);
    }

    public int staffDischargeEditHours() {
        return staffEditHours;
    }

    @Transactional
    public int updateReadmissionWindow(int days) {
        int previous = readmissionWindowDays();
        SystemSetting s = repository.findById(READMISSION_WINDOW).orElseGet(() -> {
            SystemSetting n = new SystemSetting();
            n.setKey(READMISSION_WINDOW);
            return n;
        });
        s.setValue(String.valueOf(days));
        s.setUpdatedBy(CurrentUser.get().id());
        s.setUpdatedAt(LocalDateTime.now());
        repository.save(s);
        auditService.log("SETTING_UPDATED", "SYSTEM_SETTING", READMISSION_WINDOW,
                "Readmission window changed from " + previous + " to " + days + " days");
        return days;
    }
}
