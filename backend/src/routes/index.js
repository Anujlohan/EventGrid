const express = require('express');
const competitionRoutes = require('./competitionRoutes');
const registrationRoutes = require('./registrationRoutes');
const authRoutes = require('./authRoutes');
const notificationRoutes = require('./notificationRoutes');
const adminRoutes = require('./adminRoutes');
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
    'EventGrid API is healthy and operational.'
  );
});

// Mount Resource Routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/competitions', competitionRoutes);
router.use('/competitions', registrationRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
