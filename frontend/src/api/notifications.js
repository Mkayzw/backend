import { api } from './client';

export const notificationsAPI = {
  list: ({ unreadOnly = false, limit = 50 } = {}) => {
    const params = new URLSearchParams();
    if (unreadOnly) params.set('unreadOnly', 'true');
    if (limit) params.set('limit', String(limit));
    const query = params.toString();
    return api.get(`/api/notifications/${query ? `?${query}` : ''}`);
  },
  markRead: (notificationId) =>
    api.patch(`/api/notifications/${notificationId}/read`),
  markAllRead: () => api.patch('/api/notifications/read-all'),
};
