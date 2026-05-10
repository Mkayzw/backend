import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { notificationsAPI } from '../api/notifications';
import { useAuth } from './AuthContext';
import { startRealtimeStream } from '../realtime/sse';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ unreadAlerts: 0 });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const streamRef = useRef(null);

  const setUnreadAlerts = useCallback((count) => {
    setCounts(prev => ({ ...prev, unreadAlerts: count }));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await notificationsAPI.list({ limit: 50 });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // best-effort
    }
  }, []);

  const markRead = useCallback(async (id) => {
    try {
      const updated = await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => (n.id === id ? updated : n)));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  }, []);

  // Initial load + live SSE subscription scoped to authenticated user
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      if (streamRef.current) {
        streamRef.current.stop();
        streamRef.current = null;
      }
      return;
    }

    refresh();

    const token = localStorage.getItem('rpm_token');
    if (!token) return;

    streamRef.current = startRealtimeStream({
      token,
      onEvent: (evt) => {
        if (evt?.event !== 'notification.created') return;
        const incoming = evt?.data;
        if (!incoming?.id) return;
        setNotifications(prev => {
          if (prev.some(n => n.id === incoming.id)) return prev;
          return [incoming, ...prev].slice(0, 50);
        });
        if (!incoming.isRead) {
          setUnreadCount(c => c + 1);
        }
      },
      onError: () => {},
    });

    return () => {
      if (streamRef.current) {
        streamRef.current.stop();
        streamRef.current = null;
      }
    };
  }, [user, refresh]);

  return (
    <NotificationContext.Provider
      value={{
        counts,
        setUnreadAlerts,
        notifications,
        unreadCount,
        refresh,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
