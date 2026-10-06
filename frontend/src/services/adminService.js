import { api } from './api';

export const adminService = {
  getStats: async () => {
    const res = await api.get('/admin/stats');
    return res;
  },

  getUsers: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.role) query.append('role', params.role);
    if (params.search) query.append('search', params.search);

    const qs = query.toString();
    const res = await api.get(`/admin/users${qs ? `?${qs}` : ''}`);
    return res;
  },

  updateUserRole: async (userId, newRole) => {
    const res = await api.patch(`/admin/users/${userId}/role`, { role: newRole });
    return res;
  },

  getAllRegistrations: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const qs = query.toString();
    const res = await api.get(`/admin/registrations${qs ? `?${qs}` : ''}`);
    return res;
  },
};
