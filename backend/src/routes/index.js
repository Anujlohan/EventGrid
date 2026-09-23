const express = require('express');
const competitionRoutes = require('./competitionRoutes');
const registrationRoutes = require('./registrationRoutes');
const authRoutes = require('./authRoutes');
const { successResponse } = require('../utils/apiResponse');

const router = express.Router();

// Health Check Endpoint
router.get('/health', (req, res) => {
  return successResponse(
    res,
    200,
    {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    'Competition API is healthy and operational.'
  );
});

// Mount Resource Routes
router.use('/auth', authRoutes);
router.use('/competitions', competitionRoutes);
router.use('/competitions', registrationRoutes);

module.exports = router;
