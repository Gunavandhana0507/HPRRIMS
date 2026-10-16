import { Route, Routes } from 'react-router-dom';
import { HomeRedirect, RequireAuth, RequireRole } from './auth/guards';
import { AppShell } from './layout/AppShell';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import StaffDashboard from './pages/StaffDashboard';
import PatientList from './pages/PatientList';
import PatientForm from './pages/PatientForm';
import PatientProfile from './pages/PatientProfile';
import PatientHistory from './pages/PatientHistory';
import AdmissionList from './pages/AdmissionList';
import AdmissionNew from './pages/AdmissionNew';
import AdmissionDetail from './pages/AdmissionDetail';
import MedicalRecords from './pages/MedicalRecords';
import DischargePage from './pages/DischargePage';
import IcuPage from './pages/IcuPage';
import IcuRequestNew from './pages/IcuRequestNew';
import PredictionsPage from './pages/PredictionsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import AuditPage from './pages/AuditPage';
import SettingsPage from './pages/SettingsPage';
import NotFound from './pages/NotFound';

const ALL = ['ADMIN', 'DOCTOR', 'STAFF'];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<HomeRedirect />} />
          <Route element={<RequireRole roles={['ADMIN']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/reports" element={<ReportsPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/audit" element={<AuditPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
          </Route>
          <Route element={<RequireRole roles={['DOCTOR']} />}>
            <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          </Route>
          <Route element={<RequireRole roles={['STAFF']} />}>
            <Route path="/staff/dashboard" element={<StaffDashboard />} />
            <Route path="/patients/new" element={<PatientForm />} />
            <Route path="/admissions/new" element={<AdmissionNew />} />
            <Route path="/admissions/:id/discharge" element={<DischargePage />} />
            <Route path="/icu/requests/new" element={<IcuRequestNew />} />
          </Route>
          <Route element={<RequireRole roles={['ADMIN', 'STAFF']} />}>
            <Route path="/patients/:id/edit" element={<PatientForm />} />
          </Route>
          <Route element={<RequireRole roles={['ADMIN', 'DOCTOR']} />}>
            <Route path="/admissions/:id/records" element={<MedicalRecords />} />
            <Route path="/predictions" element={<PredictionsPage />} />
          </Route>
          <Route element={<RequireRole roles={ALL} />}>
            <Route path="/patients" element={<PatientList />} />
            <Route path="/patients/:id" element={<PatientProfile />} />
            <Route path="/patients/:id/history" element={<PatientHistory />} />
            <Route path="/admissions" element={<AdmissionList />} />
            <Route path="/admissions/:id" element={<AdmissionDetail />} />
            <Route path="/icu" element={<IcuPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
