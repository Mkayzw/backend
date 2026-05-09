import { api } from './client';

export const auditAPI = {
  getLogs: ({ limit = 100, action, resourceType, actorUserId } = {}) => {
    const params = new URLSearchParams();
    params.set('limit', limit);
    if (action) params.set('action', action);
    if (resourceType) params.set('resourceType', resourceType);
    if (actorUserId) params.set('actorUserId', actorUserId);
    return api.get(`/api/audit/logs?${params.toString()}`);
  },
};

