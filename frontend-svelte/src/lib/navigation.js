import {
  Activity,
  Bell,
  ClipboardList,
  FileHeart,
  LayoutDashboard,
  Link2,
  Stethoscope,
  UserCog,
  Users,
} from 'lucide-svelte'

export const navItems = {
  PATIENT: [
    { href: '/patient', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/patient/report', label: 'Report Symptoms', icon: FileHeart },
    { href: '/patient/clinicians', label: 'My Clinicians', icon: Stethoscope },
    { href: '/patient/history', label: 'My Reports', icon: ClipboardList },
  ],
  CLINICIAN: [
    { href: '/clinician', label: 'Patients', icon: Users },
    { href: '/clinician/alerts', label: 'Alerts', icon: Bell },
    { href: '/clinician/tasks', label: 'Tasks', icon: ClipboardList },
    { href: '/clinician/trends', label: 'Trends', icon: Activity },
  ],
  ADMIN: [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: UserCog },
    { href: '/admin/assignments', label: 'Assignments', icon: Link2 },
    { href: '/admin/alerts', label: 'Alerts', icon: Bell },
    { href: '/admin/metrics', label: 'Metrics', icon: Activity },
  ],
}
