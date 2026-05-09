import { api } from './client';

export const pushAPI = {
  getPublicKey: () => api.get('/api/push/public-key'),
  upsertSubscription: (subscription) => api.post('/api/push/subscriptions', subscription),
};

