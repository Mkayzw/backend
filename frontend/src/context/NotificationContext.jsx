import { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [counts, setCounts] = useState({ unreadAlerts: 0 });

  const setUnreadAlerts = useCallback((count) => {
    setCounts(prev => ({ ...prev, unreadAlerts: count }));
  }, []);

  return (
    <NotificationContext.Provider value={{ counts, setUnreadAlerts }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
