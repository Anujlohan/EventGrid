const express = require('express');
const notificationController = require('../controllers/notificationController');
const { validateObjectId } = require('../middleware/validator');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// All notification routes strictly require JWT authentication
router.use(authenticateToken);

// GET /api/notifications - List user's notifications (paginated)
router.get('/', notificationController.getNotifications);

// GET /api/notifications/unread-count - Get total unread notifications
router.get('/unread-count', notificationController.getUnreadCount);

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', notificationController.markAllAsRead);
router.put('/read-all', notificationController.markAllAsRead);

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch('/:id/read', validateObjectId('id'), notificationController.markAsRead);
router.put('/:id/read', validateObjectId('id'), notificationController.markAsRead);

module.exports = router;
