const notificationService = require('../services/notificationService');
const { successResponse } = require('../utils/apiResponse');

const getNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.getUserNotifications(req.user.userId, req.query);
    return successResponse(res, 200, result, 'Notifications retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await notificationService.markNotificationAsRead(id, req.user.userId);
    return successResponse(res, 200, result, 'Notification marked as read.');
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllNotificationsAsRead(req.user.userId);
    return successResponse(res, 200, result, 'All notifications marked as read.');
  } catch (error) {
    next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const result = await notificationService.getUnreadCount(req.user.userId);
    return successResponse(res, 200, result, 'Unread notification count retrieved.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
