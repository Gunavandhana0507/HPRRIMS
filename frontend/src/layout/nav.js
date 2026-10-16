import {
  Activity, BedDouble, ClipboardList, FileBarChart, LayoutDashboard, ScrollText, Settings, UserPlus, Users, UsersRound,
} from 'lucide-react';

export const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN'] },
  { to: '/doctor/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['DOCTOR'] },
  { to: '/staff/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['STAFF'] },
  { to: '/patients', label: 'Patients', icon: UsersRound, roles: ['ADMIN', 'DOCTOR', 'STAFF'] },
  { to: '/patients/new', label: 'Register patient', icon: UserPlus, roles: ['STAFF'] },
  { to: '/admissions', label: 'Admissions', icon: ClipboardList, roles: ['ADMIN', 'DOCTOR', 'STAFF'] },
  { to: '/icu', label: 'ICU beds & requests', icon: BedDouble, roles: ['ADMIN', 'DOCTOR', 'STAFF'] },
  { to: '/predictions', label: 'Readmission risk', icon: Activity, roles: ['ADMIN', 'DOCTOR'] },
  { to: '/admin/reports', label: 'Reports', icon: FileBarChart, roles: ['ADMIN'] },
  { to: '/admin/users', label: 'User accounts', icon: Users, roles: ['ADMIN'] },
  { to: '/admin/audit', label: 'Audit log', icon: ScrollText, roles: ['ADMIN'] },
  { to: '/admin/settings', label: 'Settings', icon: Settings, roles: ['ADMIN'] },
];
