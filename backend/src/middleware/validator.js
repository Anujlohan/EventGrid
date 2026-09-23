const mongoose = require('mongoose');
const AppError = require('../utils/appError');

/**
 * Middleware to validate MongoDB ObjectId in route params
 * @param {string} paramName - Parameter name (e.g. 'id', 'competitionId')
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
      return next(
        new AppError(
          `Invalid ${paramName} parameter. Must be a valid 24-character hexadecimal ObjectId.`,
          400
        )
      );
    }
    next();
  };
};

/**
 * Middleware to validate registration body payload
 */
const validateRegisterPayload = (req, res, next) => {
  if (req.body && req.body.participantDetails) {
    const { fullName, email, phone } = req.body.participantDetails;
    if (fullName && fullName.trim().length < 2) {
      return next(new AppError('Participant full name must be at least 2 characters long.', 400));
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return next(new AppError('Please provide a valid participant email address.', 400));
    }
    if (phone && phone.trim().length < 7) {
      return next(new AppError('Please provide a valid phone number (minimum 7 digits).', 400));
    }
  }
  next();
};

/**
 * Middleware to validate creation of a competition
 */
const validateCreateCompetition = (req, res, next) => {
  const {
    title,
    description,
    organizer,
    totalSpots,
    registrationStartDate,
    registrationDeadline,
    startDate,
    endDate,
  } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    return next(new AppError('Competition title is required (min 3 characters).', 400));
  }

  if (!description || typeof description !== 'string' || description.trim().length < 5) {
    return next(new AppError('Competition description is required (min 5 characters).', 400));
  }

  if (!organizer || typeof organizer !== 'string' || organizer.trim().length < 2) {
    return next(new AppError('Organizer name is required.', 400));
  }

  const spots = parseInt(totalSpots, 10);
  if (isNaN(spots) || spots <= 0) {
    return next(new AppError('totalSpots must be a positive integer greater than 0.', 400));
  }

  if (!registrationStartDate || isNaN(new Date(registrationStartDate).getTime())) {
    return next(new AppError('A valid registrationStartDate is required.', 400));
  }

  if (!registrationDeadline || isNaN(new Date(registrationDeadline).getTime())) {
    return next(new AppError('A valid registrationDeadline is required.', 400));
  }

  if (!startDate || isNaN(new Date(startDate).getTime())) {
    return next(new AppError('A valid startDate is required.', 400));
  }

  if (!endDate || isNaN(new Date(endDate).getTime())) {
    return next(new AppError('A valid endDate is required.', 400));
  }

  const regStart = new Date(registrationStartDate);
  const regDeadline = new Date(registrationDeadline);
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (regStart > regDeadline) {
    return next(new AppError('registrationStartDate must be less than or equal to registrationDeadline.', 400));
  }

  if (regDeadline >= start) {
    return next(new AppError('registrationDeadline must be strictly before startDate.', 400));
  }

  if (start > end) {
    return next(new AppError('startDate must be less than or equal to endDate.', 400));
  }

  next();
};

module.exports = {
  validateObjectId,
  validateRegisterPayload,
  validateCreateCompetition,
};
