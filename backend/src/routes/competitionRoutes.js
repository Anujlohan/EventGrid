const express = require('express');
const competitionController = require('../controllers/competitionController');
const {
  validateObjectId,
  validateCreateCompetition,
  validateUpdateCompetition,
} = require('../middleware/validator');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/competitions - List all genuine competitions
router.get('/', competitionController.getCompetitions);

// GET /api/competitions/categories - Scalable categories taxonomy with sports subcategories
router.get('/categories', competitionController.getCategories);

// POST /api/competitions - Create a new real competition (requires Organizer or Admin role)
router.post(
  '/',
  authenticateToken,
  requireRole('Organizer', 'Admin'),
  validateCreateCompetition,
  competitionController.createCompetition
);

// GET /api/competitions/:id/participants - View participant roster (Creator or Admin only)
router.get(
  '/:id/participants',
  authenticateToken,
  validateObjectId('id'),
  competitionController.getCompetitionParticipants
);

// GET /api/competitions/:id - Get single competition details + dynamic lifecycle
router.get(
  '/:id',
  optionalAuth,
  validateObjectId('id'),
  competitionController.getCompetitionById
);

// PUT /api/competitions/:id - Update competition (Creator or Admin only)
router.put(
  '/:id',
  authenticateToken,
  validateObjectId('id'),
  validateUpdateCompetition,
  competitionController.updateCompetition
);

// DELETE /api/competitions/:id - Delete or archive/cancel competition (Creator or Admin only)
router.delete(
  '/:id',
  authenticateToken,
  validateObjectId('id'),
  competitionController.deleteCompetition
);

module.exports = router;
