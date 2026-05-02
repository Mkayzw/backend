import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Bell, Search } from 'lucide-react';
import './TopBar.css';

export default function TopBar({ title, subtitle }) {
  const { user } = useAuth();
  const { counts } = useNotifications();

  const roleLabels = {
    PATIENT: 'Patient Portal',
    CLINICIAN: 'Clinical Dashboard',
    ADMIN: 'Admin Console',
  };

  return (
    <header className="topbar">
      <div className="topbar__left">
        <div>
          <h2 className="topbar__title">{title}</h2>
          {subtitle && <p className="topbar__subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="topbar__right">
        <div className="topbar__notif">
          <Bell size={18} />
          {counts.unreadAlerts > 0 && (
            <span className="topbar__notif-badge">{counts.unreadAlerts}</span>
          )}
        </div>
        <span className="topbar__role-badge">{roleLabels[user?.role] || ''}</span>
      </div>
    </header>
  );
}
