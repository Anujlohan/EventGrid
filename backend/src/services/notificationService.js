const { Notification } = require('../models/Notification');
const AppError = require('../utils/appError');

/**
 * Persistently create a notification for a user
 * Supports MongoDB session for inclusion in atomic transactions
 */
const createNotification = async (data, session = null) => {
  const options = session ? { session } : {};
  const [notification] = await Notification.create([data], options);
  return notification;
};

/**
 * Create multiple notifications in bulk
 * Supports MongoDB session
 */
const createManyNotifications = async (notificationsArray, session = null) => {
  if (!notificationsArray || notificationsArray.length === 0) return [];
  const options = session ? { session } : {};
  return await Notification.create(notificationsArray, options);
};

/**
 * Fetch paginated notifications for an authenticated user
 */
const getUserNotifications = async (userId, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = { userId };
  if (query.isRead !== undefined) {
    if (query.isRead === 'true' || query.isRead === true) {
      filter.isRead = true;
    } else if (query.isRead === 'false' || query.isRead === false) {
      filter.isRead = false;
    }
  }

  if (query.type && typeof query.type === 'string') {
    filter.type = query.type.trim();
  }

  const [total, unreadCount, notifications] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, isRead: false }),
    Notification.find(filter)
      .populate('competitionId', 'title category startDate endDate location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    notifications,
    total,
    unreadCount,
    page,
    limit,
    totalPages,
  };
};

/**
 * Mark a single notification as read with strict user ownership enforcement
 */
const markNotificationAsRead = async (id, userId) => {
  const notification = await Notification.findById(id);
  if (!notification) {
    throw new AppError('Notification not found.', 404);
  }

  // Strict User Ownership Enforcement
  if (notification.userId.toString() !== userId.toString()) {
    throw new AppError('Access denied. You do not own this notification.', 403);
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return notification.toObject ? notification.toObject() : notification;
};

/**
 * Mark all unread notifications for a user as read
 */
const markAllNotificationsAsRead = async (userId) => {
  const now = new Date();
  const result = await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true, readAt: now } }
  );

  return {
    success: true,
    modifiedCount: result.modifiedCount || 0,
    markedAt: now,
  };
};

/**
 * Get unread notification count for a user
 */
const getUnreadCount = async (userId) => {
  const count = await Notification.countDocuments({ userId, isRead: false });
  return { unreadCount: count };
};

module.exports = {
  createNotification,
  createManyNotifications,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
};
