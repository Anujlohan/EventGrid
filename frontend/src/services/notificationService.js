import { api } from './api';

export const notificationService = {
  /**
   * Fetch authenticated user's notifications with pagination
   * @param {object} [params]
   * @returns {Promise<object>}
   */
  getNotifications: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.unreadOnly) query.append('unreadOnly', 'true');

    const queryString = query.toString();
    return await api.get(`/notifications${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get unread notifications count
   * @returns {Promise<object>}
   */
  getUnreadCount: async () => {
    return await api.get('/notifications/unread-count');
  },

  /**
   * Mark a single notification as read
   * @param {string} notificationId
   * @returns {Promise<object>}
   */
  markAsRead: async (notificationId) => {
    return await api.patch(`/notifications/${notificationId}/read`);
  },

  /**
   * Mark all notifications as read
   * @returns {Promise<object>}
   */
  markAllAsRead: async () => {
    return await api.patch('/notifications/read-all');
  },
};
