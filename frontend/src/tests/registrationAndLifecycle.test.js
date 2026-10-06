global.__DEV__ = true;

jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: (obj) => (obj ? (obj.web ?? obj.default ?? obj.ios ?? obj.android) : undefined),
  },
  Alert: {
    alert: jest.fn(),
  },
  StyleSheet: {
    create: (styles) => styles,
  },
  View: 'View',
  Text: 'Text',
}));

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/storageService', () => ({
  storageService: {
    clearAuth: jest.fn().mockResolvedValue(undefined),
    setItem: jest.fn().mockResolvedValue(undefined),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

import { competitionService } from '../services/competitionService';
import { notificationService } from '../services/notificationService';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';

describe('Competition Registration, Waitlist & Notifications Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. REGISTRATION & CANCELLATION FLOWS
  // ==========================================
  describe('Competition Registration Operations', () => {
    test('1. registerUser sends participant details to registration endpoint', async () => {
      const postSpy = jest.spyOn(api, 'post').mockResolvedValueOnce({
        registration: {
          _id: 'reg_123',
          status: 'CONFIRMED',
          competitionId: 'comp_abc',
        },
      });

      const participantDetails = {
        fullName: 'Jordan Lee',
        email: 'jordan@example.com',
        phone: '+1 555-0144',
        collegeOrOrg: 'Engineering Institute',
      };

      const res = await competitionService.registerUser('comp_abc', participantDetails);

      expect(postSpy).toHaveBeenCalledWith('/competitions/comp_abc/register', {
        participantDetails,
      });
      expect(res.registration.status).toBe('CONFIRMED');
    });

    test('2. Handles registration capacity conflict (409 Conflict)', async () => {
      jest.spyOn(api, 'post').mockRejectedValueOnce({
        status: 409,
        message: 'You are already registered for this competition.',
      });

      await expect(
        competitionService.registerUser('comp_abc', { fullName: 'Jordan' })
      ).rejects.toEqual(
        expect.objectContaining({
          status: 409,
          message: 'You are already registered for this competition.',
        })
      );
    });

    test('3. cancelRegistration sends delete request to release reservation', async () => {
      const deleteSpy = jest.spyOn(api, 'delete').mockResolvedValueOnce({
        message: 'Registration successfully cancelled. Spot released.',
      });

      const res = await competitionService.cancelRegistration('comp_abc');

      expect(deleteSpy).toHaveBeenCalledWith('/competitions/comp_abc/register');
      expect(res.message).toContain('cancelled');
    });

    test('4. getMyRegistrations fetches authenticated user registration history', async () => {
      const getSpy = jest.spyOn(api, 'get').mockResolvedValueOnce({
        registrations: [
          { _id: 'reg_1', status: 'CONFIRMED', competitionTitle: 'AI Challenge' },
          { _id: 'reg_2', status: 'WAITLISTED', competitionTitle: 'Robotics Cup' },
        ],
      });

      const res = await competitionService.getMyRegistrations();

      expect(getSpy).toHaveBeenCalledWith('/competitions/registrations/my');
      expect(res.registrations).toHaveLength(2);
      expect(res.registrations[1].status).toBe('WAITLISTED');
    });
  });

  // ==========================================
  // 2. WAITLIST & STATUS BADGE CONFIGURATION
  // ==========================================
  describe('StatusBadge Waitlist & Lifecycle Badges', () => {
    test('5. StatusBadge correctly renders WAITLISTED badge attributes', () => {
      const badge = StatusBadge({ status: 'WAITLISTED' });
      expect(badge).toBeDefined();

      const badgeChildren = badge.props.children;
      const textElement = badgeChildren[1];
      expect(textElement.props.children).toBe('Waitlisted');
      const colorStyle = Array.isArray(textElement.props.style)
        ? textElement.props.style.find((s) => s && s.color)
        : textElement.props.style;
      expect(colorStyle.color).toBe('#FCD34D');
    });

    test('6. StatusBadge correctly renders CONFIRMED badge attributes', () => {
      const badge = StatusBadge({ status: 'CONFIRMED' });
      const textElement = badge.props.children[1];
      expect(textElement.props.children).toBe('Confirmed');
      const colorStyle = Array.isArray(textElement.props.style)
        ? textElement.props.style.find((s) => s && s.color)
        : textElement.props.style;
      expect(colorStyle.color).toBe('#86EFAC');
    });

    test('7. StatusBadge correctly renders CANCELLED badge attributes', () => {
      const badge = StatusBadge({ status: 'CANCELLED' });
      const textElement = badge.props.children[1];
      expect(textElement.props.children).toBe('Cancelled');
      const colorStyle = Array.isArray(textElement.props.style)
        ? textElement.props.style.find((s) => s && s.color)
        : textElement.props.style;
      expect(colorStyle.color).toBe('#FCA5A5');
    });

    test('8. StatusBadge falls back to UPCOMING for undefined or unknown status', () => {
      const badge = StatusBadge({ status: 'UNKNOWN_STATUS' });
      const textElement = badge.props.children[1];
      expect(textElement.props.children).toBe('Upcoming');
    });
  });

  // ==========================================
  // 3. NOTIFICATION SERVICE OPERATIONS
  // ==========================================
  describe('Notification Service API Operations', () => {
    test('9. getNotifications queries notifications with pagination and unread filters', async () => {
      const getSpy = jest.spyOn(api, 'get').mockResolvedValueOnce({
        notifications: [
          { _id: 'notif_1', type: 'REGISTRATION_CONFIRMED', isRead: false },
          { _id: 'notif_2', type: 'WAITLIST_PROMOTED', isRead: false },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      });

      const res = await notificationService.getNotifications({
        page: 1,
        limit: 10,
        unreadOnly: true,
      });

      expect(getSpy).toHaveBeenCalledWith('/notifications?page=1&limit=10&unreadOnly=true');
      expect(res.notifications).toHaveLength(2);
      expect(res.notifications[1].type).toBe('WAITLIST_PROMOTED');
    });

    test('10. getUnreadCount retrieves unread notification count', async () => {
      const getSpy = jest.spyOn(api, 'get').mockResolvedValueOnce({
        unreadCount: 4,
      });

      const res = await notificationService.getUnreadCount();

      expect(getSpy).toHaveBeenCalledWith('/notifications/unread-count');
      expect(res.unreadCount).toBe(4);
    });

    test('11. markAsRead patches single notification status', async () => {
      const patchSpy = jest.spyOn(api, 'patch').mockResolvedValueOnce({
        notification: { _id: 'notif_123', isRead: true },
      });

      const res = await notificationService.markAsRead('notif_123');

      expect(patchSpy).toHaveBeenCalledWith('/notifications/notif_123/read');
      expect(res.notification.isRead).toBe(true);
    });

    test('12. markAllAsRead patches all notifications as read', async () => {
      const patchSpy = jest.spyOn(api, 'patch').mockResolvedValueOnce({
        modifiedCount: 5,
      });

      const res = await notificationService.markAllAsRead();

      expect(patchSpy).toHaveBeenCalledWith('/notifications/read-all');
      expect(res.modifiedCount).toBe(5);
    });
  });
});
