const express = require('express');
const registrationController = require('../controllers/registrationController');
const { validateObjectId, validateRegisterPayload } = require('../middleware/validator');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

// All registration routes require JWT authentication
router.use(authenticateToken);

// GET /api/competitions/registrations/my - List authenticated user's registered competitions
router.get('/registrations/my', registrationController.getUserRegistrations);

// GET /api/competitions/:id/registration - Check authenticated user's registration status
router.get(
  '/:id/registration',
  validateObjectId('id'),
  registrationController.getRegistrationStatus
);

// POST /api/competitions/:id/register - Atomically register authenticated user via ACID Transaction
router.post(
  '/:id/register',
  validateObjectId('id'),
  validateRegisterPayload,
  registrationController.register
);

// POST /api/competitions/:id/waitlist - Atomically join waitlist via ACID Transaction
router.post(
  '/:id/waitlist',
  validateObjectId('id'),
  validateRegisterPayload,
  registrationController.joinWaitlist
);

// DELETE /api/competitions/:id/register - Cancel registration via ACID Transaction
router.delete(
  '/:id/register',
  validateObjectId('id'),
  registrationController.cancelRegistration
);

// DELETE /api/competitions/:id/waitlist - Cancel waitlist entry via ACID Transaction
router.delete(
  '/:id/waitlist',
  validateObjectId('id'),
  registrationController.cancelRegistration
);

module.exports = router;
