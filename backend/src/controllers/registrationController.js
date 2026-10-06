const registrationService = require('../services/registrationService');
const { successResponse } = require('../utils/apiResponse');
const AppError = require('../utils/appError');

const getRegistrationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Strictly extract userId from authenticated JWT
    const userId = req.user.userId;

    const result = await registrationService.getRegistrationStatus(id, userId);
    return successResponse(res, 200, result, 'Registration status retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Strictly extract userId from authenticated JWT; never trust client-supplied userId
    const userId = req.user.userId;
    const { participantDetails } = req.body;

    const result = await registrationService.registerUser(id, userId, participantDetails);
    return successResponse(res, 201, result, 'Successfully registered for the competition.');
  } catch (error) {
    next(error);
  }
};

const joinWaitlist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { participantDetails } = req.body;

    const result = await registrationService.joinWaitlistUser(id, userId, participantDetails);
    return successResponse(
      res,
      201,
      result,
      'Successfully joined the waitlist for this competition.'
    );
  } catch (error) {
    next(error);
  }
};

const cancelRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Strictly extract userId from authenticated JWT
    const userId = req.user.userId;

    const result = await registrationService.cancelRegistration(id, userId);
    return successResponse(res, 200, result, 'Registration cancelled successfully.');
  } catch (error) {
    next(error);
  }
};

const getUserRegistrations = async (req, res, next) => {
  try {
    // Strictly extract userId from authenticated JWT
    const userId = req.user.userId;

    const result = await registrationService.getUserRegistrations(userId);
    return successResponse(res, 200, result, 'User registrations retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRegistrationStatus,
  register,
  joinWaitlist,
  cancelRegistration,
  getUserRegistrations,
};
