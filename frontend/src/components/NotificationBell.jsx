import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import './NotificationBell.css';

const TYPE_LABEL = {
  HIGH_RISK_ALERT: 'High-risk alert',
  WORSENING_TREND: 'Worsening trend',
  FOLLOW_UP_SCHEDULED: 'Follow-up scheduled',
  FOLLOW_UP_RESPONSE: 'Clinician response',
  MEDICATION_CHECK_IN: 'Medication check-in',
  SYSTEM_MESSAGE: 'System',
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.max(1, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleClick = async (notif) => {
    if (!notif.isRead) {
      await markRead(notif.id);
    }
    if (notif.link) {
      setOpen(false);
      navigate(notif.link);
    }
  };

  return (
    <div className="notif-bell" ref={wrapRef}>
      <button
        type="button"
        className="topbar__notif"
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="topbar__notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel animate-fade-in">
          <div className="notif-panel__header">
            <span className="notif-panel__title">Notifications</span>
            {unreadCount > 0 && (
              <button className="notif-panel__mark-all" onClick={markAllRead}>
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>
          <div className="notif-panel__list">
            {notifications.length === 0 ? (
              <div className="notif-panel__empty">No notifications yet</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`notif-item ${n.isRead ? '' : 'notif-item--unread'}`}
                  onClick={() => handleClick(n)}
                >
                  <div className="notif-item__type">{TYPE_LABEL[n.type] || n.type}</div>
                  <div className="notif-item__title">{n.title}</div>
                  <div className="notif-item__msg">{n.message}</div>
                  <div className="notif-item__time">{timeAgo(n.createdAt)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
