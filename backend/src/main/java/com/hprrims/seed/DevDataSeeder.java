package com.hprrims.seed;

import com.hprrims.entity.*;
import com.hprrims.repository.*;
import com.hprrims.service.IcuService;
import com.hprrims.service.PredictionService;
import com.hprrims.service.ReadmissionDetectionService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Development-only seeder. Creates demo accounts and SYNTHETIC patients (not real people) when the users table is
 * empty. Enabled only when app.seed.enabled=true (the dev profile).
 */
@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
@RequiredArgsConstructor
public class DevDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);
    private static final int WINDOW = 30;

    private static final String[] FIRST = {"Aarav", "Meera", "Rohan", "Lakshmi", "Vikram", "Sneha", "Karthik", "Divya",
            "Rahul", "Ananya", "Suresh", "Farah", "Joseph", "Pooja", "Imran", "Deepa", "Manoj", "Nisha", "Ganesh",
            "Shalini", "Ravi", "Fatima", "Harish", "Kavitha"};
    private static final String[] LAST = {"Iyer", "Menon", "Sharma", "Reddy", "Pillai", "Khan", "Das", "Fernandes",
            "Gupta", "Krishnan", "Joshi", "Bose"};
    private static final String[] CITIES = {"Vellore", "Chennai", "Bengaluru", "Katpadi", "Ranipet", "Arcot"};
    private static final String[][] CASES = {
            {"Community-acquired pneumonia", "Pneumonia, right lower lobe", "Amoxicillin-clavulanate 625 mg twice daily for 7 days",
                    "Oxygen via nasal cannula, chest physiotherapy, monitor SpO2 every 4 hours"},
            {"Decompensated heart failure", "Acute on chronic heart failure (NYHA III)", "Furosemide 40 mg IV twice daily; continue bisoprolol 2.5 mg",
                    "Daily weights, fluid restriction 1.5 L/day, strict intake-output chart"},
            {"Uncontrolled type 2 diabetes", "Type 2 diabetes mellitus with hyperglycaemia", "Insulin glargine 14 units at night; metformin 500 mg twice daily",
                    "Capillary glucose before meals and at bedtime, dietitian review"},
            {"COPD exacerbation", "Acute exacerbation of COPD", "Salbutamol and ipratropium nebulisation 6-hourly; prednisolone 40 mg daily for 5 days",
                    "Controlled oxygen to target SpO2 88-92%, inhaler technique education"},
            {"Acute gastroenteritis with dehydration", "Acute gastroenteritis, moderate dehydration", "IV Ringer lactate; oral rehydration salts; ondansetron 4 mg as needed",
                    "Monitor urine output and electrolytes"},
            {"Urinary tract infection", "Complicated urinary tract infection", "Ceftriaxone 1 g IV daily",
                    "Urine culture sent, encourage oral fluids, review culture in 48 hours"},
            {"Chest pain evaluation", "Unstable angina", "Aspirin 75 mg, atorvastatin 40 mg, isosorbide mononitrate 30 mg daily",
                    "Serial ECG and troponin, cardiology review"},
            {"Post-operative wound infection", "Surgical site infection, abdominal wound", "Cefazolin 1 g IV 8-hourly",
                    "Daily wound dressing, surgical review"}};

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final AdmissionRepository admissionRepository;
    private final MedicalRecordRepository recordRepository;
    private final IcuBedRepository bedRepository;
    private final IcuRequestRepository icuRequestRepository;
    private final ReadmissionPredictionRepository predictionRepository;
    private final PredictionService predictionService;
    private final IcuService icuService;
    private final PasswordEncoder passwordEncoder;
    private final TransactionTemplate tx;

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            log.info("Seed skipped: users already exist.");
            return;
        }
        tx.executeWithoutResult(s -> seed());
        log.info("Development seed complete. Demo credentials are listed in README.md.");
    }

    private void seed() {
        User admin = user("admin", "Admin@2026", "Anitha Raman", "admin@hprrims.local", Role.ADMIN, null);
        User d1 = user("dr.mehta", "Doctor@2026", "Dr. Kavya Mehta", "kavya.mehta@hprrims.local", Role.DOCTOR, "Cardiology");
        User d2 = user("dr.rao", "Doctor@2026", "Dr. Arjun Rao", "arjun.rao@hprrims.local", Role.DOCTOR, "General Medicine");
        User s1 = user("staff.priya", "Staff@2026", "Priya Nair", "priya.nair@hprrims.local", Role.STAFF, null);
        User s2 = user("staff.arun", "Staff@2026", "Arun Kumar", "arun.kumar@hprrims.local", Role.STAFF, null);
        List<User> doctors = List.of(d1, d2);
        List<User> staff = List.of(s1, s2);

        List<IcuBed> beds = new ArrayList<>();
        for (int i = 1; i <= 5; i++) beds.add(bed(String.format("MICU-%02d", i), "Medical ICU", IcuBedStatus.AVAILABLE));
        for (int i = 1; i <= 3; i++) beds.add(bed(String.format("SICU-%02d", i), "Surgical ICU",
                i == 3 ? IcuBedStatus.MAINTENANCE : IcuBedStatus.AVAILABLE));

        Random rnd = new Random(42);
        LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);
        List<Admission> active = new ArrayList<>();
        List<Admission> discharged = new ArrayList<>();

        for (int i = 0; i < FIRST.length; i++) {
            String last = LAST[rnd.nextInt(LAST.length)];
            User registrar = staff.get(i % 2);
            Patient p = new Patient();
            p.setFullName(FIRST[i] + " " + last);
            p.setDateOfBirth(LocalDate.now().minusYears(19 + rnd.nextInt(68)).minusDays(rnd.nextInt(360)));
            p.setGender(i % 2 == 0 ? Gender.MALE : Gender.FEMALE);
            p.setContactNumber("+91 9" + String.format("%09d", rnd.nextInt(1_000_000_000)));
            p.setEmail(i % 3 == 0 ? null : (FIRST[i] + "." + last).toLowerCase() + "@example.com");
            p.setAddress((10 + rnd.nextInt(180)) + ", Gandhi Road, " + CITIES[rnd.nextInt(CITIES.length)]);
            if (i % 2 == 1) {
                p.setEmergencyContactName(FIRST[(i + 5) % FIRST.length] + " " + last);
                p.setEmergencyContactNumber("+91 8" + String.format("%09d", rnd.nextInt(1_000_000_000)));
            }
            p.setCreatedBy(registrar);
            LocalDateTime t = now.minusDays(40 + rnd.nextInt(290)).withHour(8 + rnd.nextInt(10)).withMinute(rnd.nextBoolean() ? 0 : 30);
            p.setCreatedAt(t.minusHours(1));
            p.setPatientCode("SEED-" + i);
            patientRepository.saveAndFlush(p);
            p.setPatientCode(String.format("PAT-%06d", p.getId()));

            boolean endActive = i < 8;
            int visits = 1 + rnd.nextInt(3);
            Admission prev = null;
            for (int v = 0; v < visits; v++) {
                boolean makeActive = endActive && v == visits - 1;
                if (makeActive) {
                    t = now.minusDays(rnd.nextInt(6)).minusHours(1 + rnd.nextInt(8));
                    if (prev != null && t.isBefore(prev.getDischargedAt())) t = prev.getDischargedAt().plusHours(3);
                    if (t.isAfter(now)) break;
                }
                String[] c = CASES[rnd.nextInt(CASES.length)];
                User doc = doctors.get(rnd.nextInt(doctors.size()));
                Admission a = new Admission();
                a.setPatient(p);
                a.setDoctor(doc);
                a.setAdmittedAt(t);
                a.setReason(c[0]);
                a.setWard(rnd.nextBoolean() ? "General Ward A" : "General Ward B");
                a.setStatus(AdmissionStatus.ADMITTED);
                a.setReadmissionWindowDays(WINDOW);
                if (prev != null) {
                    var check = ReadmissionDetectionService.evaluate(prev, t, WINDOW);
                    a.setReadmission(check.readmission());
                    a.setPreviousAdmission(prev);
                    a.setDaysSincePreviousDischarge(check.daysSinceDischarge());
                }
                a.setCreatedBy(registrar);
                a.setCreatedAt(t);
                LocalDateTime dis = t.plusDays(2 + rnd.nextInt(8)).withHour(11 + rnd.nextInt(5)).withMinute(0);
                if (!makeActive && dis.isAfter(now.minusHours(2))) makeActive = true;
                if (!makeActive) {
                    a.setStatus(AdmissionStatus.DISCHARGED);
                    a.setDischargedAt(dis);
                    a.setDischargeRecordedAt(dis.plusMinutes(20));
                    a.setDischargedBy(registrar);
                    a.setDischargeSummary("Admitted with " + c[0].toLowerCase() + ". Diagnosis: " + c[1]
                            + ". Responded to treatment and was clinically stable at discharge. Medications reconciled.");
                    a.setFollowUpNotes("Review in outpatient clinic in 7 days with " + doc.getFullName() + ".");
                }
                admissionRepository.saveAndFlush(a);
                record(a, doc, c[1], c[2], c[3], t.plusHours(2));
                if (!makeActive) {
                    record(a, doc, null, null, "Clinically improving. Plan discharge with oral medication.", dis.minusHours(3));
                }
                if (makeActive) {
                    active.add(a);
                    break;
                }
                discharged.add(a);
                prev = a;
                int gap = rnd.nextInt(10) < 4 ? 4 + rnd.nextInt(22) : 45 + rnd.nextInt(90);
                t = dis.plusDays(gap).withHour(8 + rnd.nextInt(10));
                if (t.isAfter(now.minusDays(1))) break;
            }
        }

        for (Admission a : discharged) {
            var out = predictionService.predict(a.getId(), PredictionTrigger.SEED);
            if (out.prediction() != null) {
                predictionRepository.findById(out.prediction().id()).ifPresent(pr -> pr.setCreatedAt(a.getDischargedAt().plusMinutes(25)));
            }
        }

        if (active.size() >= 2) {
            IcuRequest allocated = icu(active.get(0), s1, 128, 88, 30, 86, 38.9, 12, true, 3, now.minusHours(6));
            allocated.setStatus(IcuRequestStatus.ALLOCATED);
            allocated.setBed(beds.get(0));
            beds.get(0).setStatus(IcuBedStatus.OCCUPIED);
            allocated.setDecidedBy(admin);
            allocated.setDecidedAt(now.minusHours(5));
            allocated.setDecisionNotes("Allocated after review of vitals.");
            icu(active.get(1), s2, 104, 112, 22, 93, 37.8, 15, false, 1, now.minusHours(2));
        }
        log.info("Seeded {} users, {} beds, {} patients, {} active and {} discharged admissions",
                userRepository.count(), beds.size(), patientRepository.count(), active.size(), discharged.size());
    }

    private User user(String username, String password, String name, String email, Role role, String specialization) {
        User u = new User();
        u.setUsername(username);
        u.setPasswordHash(passwordEncoder.encode(password));
        u.setFullName(name);
        u.setEmail(email);
        u.setRole(role);
        u.setSpecialization(specialization);
        u.setActive(true);
        return userRepository.save(u);
    }

    private IcuBed bed(String number, String ward, IcuBedStatus status) {
        IcuBed b = new IcuBed();
        b.setBedNumber(number);
        b.setWard(ward);
        b.setStatus(status);
        return bedRepository.save(b);
    }

    private void record(Admission a, User doctor, String diagnosis, String prescription, String notes, LocalDateTime at) {
        MedicalRecord m = new MedicalRecord();
        m.setAdmission(a);
        m.setDoctor(doctor);
        m.setDiagnosis(diagnosis);
        m.setPrescription(prescription);
        m.setTreatmentNotes(notes);
        m.setCreatedAt(at);
        recordRepository.save(m);
    }

    private IcuRequest icu(Admission a, User by, int hr, int sbp, int rr, int spo2, double temp, int gcs, boolean vent,
                           int comorbidities, LocalDateTime at) {
        IcuRequest r = new IcuRequest();
        r.setAdmission(a);
        r.setRequestedBy(by);
        r.setHeartRate(hr);
        r.setSystolicBp(sbp);
        r.setRespiratoryRate(rr);
        r.setSpo2(spo2);
        r.setTemperature(temp);
        r.setGcs(gcs);
        r.setRequiresVentilation(vent);
        r.setComorbidityCount(comorbidities);
        r.setClinicalNotes("Synthetic demo request.");
        r.setStatus(IcuRequestStatus.PENDING);
        r.setCreatedAt(at);
        icuService.score(r);
        return icuRequestRepository.save(r);
    }
}
