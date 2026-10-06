const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validator');

const router = express.Router();

// All admin routes strictly require JWT authentication and the Admin role
router.use(authenticateToken);
router.use(requireRole('Admin'));

// Platform statistics
router.get('/stats', adminController.getPlatformStats);

// User and organizer management
router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/role', validateObjectId('id'), adminController.updateUserRole);

// Platform-wide registrations
router.get('/registrations', adminController.getAllRegistrations);

module.exports = router;
