const express = require('express');
const competitionController = require('../controllers/competitionController');
const { validateObjectId, validateCreateCompetition } = require('../middleware/validator');
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/competitions - List all genuine competitions
router.get('/', competitionController.getCompetitions);

// POST /api/competitions - Create a new real competition (requires auth)
router.post(
  '/',
  authenticateToken,
  validateCreateCompetition,
  competitionController.createCompetition
);

// GET /api/competitions/:id - Get single competition details + dynamic lifecycle
router.get(
  '/:id',
  optionalAuth,
  validateObjectId('id'),
  competitionController.getCompetitionById
);

module.exports = router;
