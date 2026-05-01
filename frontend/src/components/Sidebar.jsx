import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileHeart, Users, UserCog, Stethoscope,
  Link2, Bell, BarChart3, Activity, LogOut, Heart, ClipboardList,
  UserCheck, Settings
} from 'lucide-react';
import './Sidebar.css';

const navItems = {
  PATIENT: [
    { to: '/patient', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/patient/report', icon: FileHeart, label: 'Report Symptoms' },
    { to: '/patient/clinicians', icon: Stethoscope, label: 'My Clinicians' },
    { to: '/patient/history', icon: ClipboardList, label: 'My Reports' },
  ],
  CLINICIAN: [
    { to: '/clinician', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/clinician/patients', icon: Users, label: 'My Patients' },
    { to: '/clinician/alerts', icon: Bell, label: 'Alerts' },
    { to: '/clinician/trends', icon: Activity, label: 'Trend Analysis' },
  ],
  ADMIN: [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/users', icon: UserCog, label: 'Users' },
    { to: '/admin/patients', icon: Users, label: 'Patients' },
    { to: '/admin/clinicians', icon: Stethoscope, label: 'Clinicians' },
    { to: '/admin/assignments', icon: Link2, label: 'Assignments' },
    { to: '/admin/alerts', icon: Bell, label: 'Alerts' },
    { to: '/admin/metrics', icon: BarChart3, label: 'System Metrics' },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const items = navItems[user?.role] || [];

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <Heart size={24} />
        </div>
        <div>
          <h1 className="sidebar__title">MedWatch</h1>
          <span className="sidebar__subtitle">Patient Monitoring</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
          >
            <item.icon size={19} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__avatar">
            {user?.fullName?.[0] || user?.email?.[0] || '?'}
          </div>
          <div className="sidebar__user-info">
            <span className="sidebar__user-name">{user?.fullName || 'User'}</span>
            <span className="sidebar__user-role">{user?.role}</span>
          </div>
        </div>
        <button className="sidebar__logout" onClick={logout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
