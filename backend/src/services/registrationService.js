const mongoose = require('mongoose');
const Competition = require('../models/Competition');
const Registration = require('../models/Registration');
const User = require('../models/User');
const AppError = require('../utils/appError');
const { runTransactionWithRetry } = require('../utils/transactionRunner');
const { enrichCompetition } = require('../utils/lifecycleHelper');
const { REGISTRATION_STATUS } = require('../constants/competitionStatus');
const { createNotification } = require('./notificationService');

/**
 * Check registration status for a user and competition
 */
const getRegistrationStatus = async (competitionId, userId) => {
  const registration = await Registration.findOne({
    userId,
    competitionId,
  }).lean();

  const isRegistered =
    registration !== null && registration.status === REGISTRATION_STATUS.CONFIRMED;
  const isWaitlisted =
    registration !== null && registration.status === REGISTRATION_STATUS.WAITLISTED;

  return {
    isRegistered,
    isWaitlisted,
    status: registration ? registration.status : null,
    waitlistPosition: registration ? registration.waitlistPosition : null,
    registration: isRegistered || isWaitlisted ? registration : null,
  };
};

/**
 * Concurrency-Safe User Registration using MongoDB ACID Transactions
 */
const registerUser = async (competitionId, userId, participantDetails = {}) => {
  // If competition is full and user opted for waitlist, redirect to joinWaitlistUser
  if (participantDetails.allowWaitlist === true || participantDetails.waitlist === true) {
    const compCheck = await Competition.findById(competitionId).lean();
    if (compCheck && compCheck.registeredCount >= compCheck.totalSpots) {
      return await joinWaitlistUser(competitionId, userId, participantDetails);
    }
  }

  return await runTransactionWithRetry(async (session) => {
    const now = new Date();

    // 1. Validate User inside session
    const user = await User.findById(userId).session(session).lean();
    if (!user) {
      throw new AppError('User not found. Please provide a valid user ID.', 404);
    }

    // 2. Check for existing active registration inside session
    const existingRegistration = await Registration.findOne({
      userId,
      competitionId,
    }).session(session);

    if (existingRegistration) {
      if (existingRegistration.status === REGISTRATION_STATUS.CONFIRMED) {
        throw new AppError('User is already registered for this competition.', 409);
      }
      if (existingRegistration.status === REGISTRATION_STATUS.WAITLISTED) {
        throw new AppError('User is already on the waitlist for this competition.', 409);
      }
    }

    // 3. Atomically reserve spot with $expr capacity guard and date constraints
    const updatedCompetition = await Competition.findOneAndUpdate(
      {
        _id: competitionId,
        registrationStartDate: { $lte: now },
        registrationDeadline: { $gte: now },
        startDate: { $gt: now },
        $expr: { $lt: ['$registeredCount', '$totalSpots'] },
      },
      { $inc: { registeredCount: 1 } },
      { session, new: true }
    );

    // 4. If atomic update failed, inspect reason in priority order and throw deterministic AppError
    if (!updatedCompetition) {
      const comp = await Competition.findById(competitionId).session(session).lean();

      if (!comp) {
        throw new AppError('Competition not found.', 404);
      }

      if (comp.isCancelled) {
        throw new AppError('Cannot register for a cancelled competition.', 400);
      }

      if (now >= new Date(comp.startDate)) {
        throw new AppError('Registration is closed because the competition has already started or ended.', 400);
      }

      if (now > new Date(comp.registrationDeadline)) {
        throw new AppError('Registration deadline for this competition has passed.', 400);
      }

      if (now < new Date(comp.registrationStartDate)) {
        throw new AppError('Registration for this competition has not opened yet.', 400);
      }

      if (comp.registeredCount >= comp.totalSpots) {
        throw new AppError('Competition is full. No spots remaining.', 409);
      }

      throw new AppError('Registration is not currently permitted for this competition.', 400);
    }

    // 5. Validate participantDetails and custom registration fields
    const fullName = (participantDetails.fullName || user.name || '').trim();
    if (!fullName || fullName.length < 2) {
      throw new AppError('Participant full name must be at least 2 characters long.', 400);
    }

    const email = (participantDetails.email || user.email || '').trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      throw new AppError('Please provide a valid participant email address.', 400);
    }

    const phone = (participantDetails.phone || participantDetails.phoneNumber || user.phoneNumber || '9999999999').trim();
    if (!/^[0-9+()\s-]{7,20}$/.test(phone)) {
      throw new AppError('Please provide a valid phone number (minimum 7 digits).', 400);
    }

    // Check competition-specific required custom fields
    const customFieldsMap = new Map();
    const incomingCustomFields = participantDetails.customFields || participantDetails.customFieldValues || {};
    if (updatedCompetition.customRegistrationFields && updatedCompetition.customRegistrationFields.length > 0) {
      for (const field of updatedCompetition.customRegistrationFields) {
        const val = incomingCustomFields[field.fieldName];
        if (field.required && (!val || !val.toString().trim())) {
          throw new AppError(`Missing required field: ${field.label || field.fieldName}`, 400);
        }
        if (val !== undefined && val !== null) {
          customFieldsMap.set(field.fieldName, val.toString().trim());
        }
      }
    } else if (typeof incomingCustomFields === 'object') {
      for (const [k, v] of Object.entries(incomingCustomFields)) {
        if (v !== undefined && v !== null) {
          customFieldsMap.set(k, v.toString().trim());
        }
      }
    }

    const finalParticipantDetails = {
      fullName,
      email,
      phone,
      customFields: customFieldsMap,
    };

    // 6. Create new Registration or reactivate existing CANCELLED record
    let registrationDoc;
    if (existingRegistration) {
      existingRegistration.status = REGISTRATION_STATUS.CONFIRMED;
      existingRegistration.registeredAt = now;
      existingRegistration.cancelledAt = null;
      existingRegistration.promotedAt = null;
      existingRegistration.waitlistPosition = null;
      existingRegistration.participantDetails = finalParticipantDetails;
      registrationDoc = await existingRegistration.save({ session });
    } else {
      const createdDocs = await Registration.create(
        [
          {
            userId,
            competitionId,
            participantDetails: finalParticipantDetails,
            status: REGISTRATION_STATUS.CONFIRMED,
            registeredAt: now,
          },
        ],
        { session }
      );
      registrationDoc = createdDocs[0];
    }

    // 7. Persistent in-app notification: REGISTRATION_CONFIRMATION
    await createNotification(
      {
        userId,
        type: 'REGISTRATION_CONFIRMATION',
        title: 'Registration Confirmed',
        message: `You have successfully registered for "${updatedCompetition.title}".`,
        competitionId: updatedCompetition._id,
      },
      session
    );

    const enrichedComp = enrichCompetition(updatedCompetition, now);

    return {
      registration: registrationDoc.toObject ? registrationDoc.toObject() : registrationDoc,
      competition: enrichedComp,
    };
  });
};

/**
 * Concurrency-Safe Waitlist Joining using MongoDB ACID Transactions
 */
const joinWaitlistUser = async (competitionId, userId, participantDetails = {}) => {
  return await runTransactionWithRetry(async (session) => {
    const now = new Date();

    const user = await User.findById(userId).session(session).lean();
    if (!user) {
      throw new AppError('User not found. Please provide a valid user ID.', 404);
    }

    const competition = await Competition.findById(competitionId).session(session);
    if (!competition) {
      throw new AppError('Competition not found.', 404);
    }

    if (competition.isCancelled) {
      throw new AppError('Cannot join waitlist for a cancelled competition.', 400);
    }

    if (now >= new Date(competition.startDate)) {
      throw new AppError('Waitlist is closed because the competition has already started or completed.', 400);
    }

    if (now > new Date(competition.registrationDeadline)) {
      throw new AppError('Registration deadline for this competition has passed.', 400);
    }

    if (now < new Date(competition.registrationStartDate)) {
      throw new AppError('Registration for this competition has not opened yet.', 400);
    }

    // "When a competition reaches capacity, allow eligible users to join a waitlist."
    if (competition.registeredCount < competition.totalSpots) {
      throw new AppError('Competition still has open spots. Direct registration is available.', 400);
    }

    // Check existing registration
    const existingRegistration = await Registration.findOne({
      userId,
      competitionId,
    }).session(session);

    if (existingRegistration) {
      if (existingRegistration.status === REGISTRATION_STATUS.CONFIRMED) {
        throw new AppError('User is already registered with a confirmed spot for this competition.', 409);
      }
      if (existingRegistration.status === REGISTRATION_STATUS.WAITLISTED) {
        throw new AppError('User is already on the waitlist for this competition.', 409);
      }
    }

    // Validate participant details
    const fullName = (participantDetails.fullName || user.name || '').trim();
    if (!fullName || fullName.length < 2) {
      throw new AppError('Participant full name must be at least 2 characters long.', 400);
    }

    const email = (participantDetails.email || user.email || '').trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      throw new AppError('Please provide a valid participant email address.', 400);
    }

    const phone = (participantDetails.phone || participantDetails.phoneNumber || user.phoneNumber || '9999999999').trim();
    if (!/^[0-9+()\s-]{7,20}$/.test(phone)) {
      throw new AppError('Please provide a valid phone number (minimum 7 digits).', 400);
    }

    const customFieldsMap = new Map();
    const incomingCustomFields = participantDetails.customFields || participantDetails.customFieldValues || {};
    if (competition.customRegistrationFields && competition.customRegistrationFields.length > 0) {
      for (const field of competition.customRegistrationFields) {
        const val = incomingCustomFields[field.fieldName];
        if (field.required && (!val || !val.toString().trim())) {
          throw new AppError(`Missing required field: ${field.label || field.fieldName}`, 400);
        }
        if (val !== undefined && val !== null) {
          customFieldsMap.set(field.fieldName, val.toString().trim());
        }
      }
    }

    const finalParticipantDetails = {
      fullName,
      email,
      phone,
      customFields: customFieldsMap,
    };

    // Calculate waitlist position (FIFO based on count of active waitlisted participants)
    const currentWaitlistCount = await Registration.countDocuments({
      competitionId,
      status: REGISTRATION_STATUS.WAITLISTED,
    }).session(session);
    const position = currentWaitlistCount + 1;

    let registrationDoc;
    if (existingRegistration) {
      existingRegistration.status = REGISTRATION_STATUS.WAITLISTED;
      existingRegistration.registeredAt = now;
      existingRegistration.cancelledAt = null;
      existingRegistration.promotedAt = null;
      existingRegistration.waitlistPosition = position;
      existingRegistration.participantDetails = finalParticipantDetails;
      registrationDoc = await existingRegistration.save({ session });
    } else {
      const createdDocs = await Registration.create(
        [
          {
            userId,
            competitionId,
            participantDetails: finalParticipantDetails,
            status: REGISTRATION_STATUS.WAITLISTED,
            waitlistPosition: position,
            registeredAt: now,
          },
        ],
        { session }
      );
      registrationDoc = createdDocs[0];
    }

    // Persistent in-app notification: WAITLIST_JOINED
    await createNotification(
      {
        userId,
        type: 'WAITLIST_JOINED',
        title: 'Added to Waitlist',
        message: `You are #${position} on the waitlist for "${competition.title}".`,
        competitionId: competition._id,
        metadata: { waitlistPosition: position },
      },
      session
    );

    const enrichedComp = enrichCompetition(competition, now);

    return {
      waitlisted: true,
      waitlistPosition: position,
      registration: registrationDoc.toObject ? registrationDoc.toObject() : registrationDoc,
      competition: enrichedComp,
    };
  });
};

/**
 * Concurrency-Safe Registration Cancellation with Atomic Waitlist Promotion
 */
const cancelRegistration = async (competitionId, userId) => {
  return await runTransactionWithRetry(async (session) => {
    const now = new Date();

    // 1. Verify competition exists and has not started yet
    const competition = await Competition.findById(competitionId).session(session);
    if (!competition) {
      throw new AppError('Competition not found.', 404);
    }

    if (now >= new Date(competition.startDate)) {
      throw new AppError('Cannot cancel registration after the competition has started or completed.', 400);
    }

    // 2. Find active registration inside session (confirmed or waitlisted)
    const registration = await Registration.findOne({
      userId,
      competitionId,
      status: { $in: [REGISTRATION_STATUS.CONFIRMED, REGISTRATION_STATUS.WAITLISTED] },
    }).session(session);

    if (!registration) {
      throw new AppError('No active confirmed registration or waitlist entry found for this user in this competition.', 404);
    }

    const wasConfirmed = registration.status === REGISTRATION_STATUS.CONFIRMED;

    // 3. Mark registration as CANCELLED
    registration.status = REGISTRATION_STATUS.CANCELLED;
    registration.cancelledAt = now;
    registration.waitlistPosition = null;
    await registration.save({ session });

    // 4. Send cancellation notification to cancelling user
    await createNotification(
      {
        userId,
        type: 'REGISTRATION_CANCELLATION',
        title: 'Registration Cancelled',
        message: `Your registration for "${competition.title}" has been cancelled.`,
        competitionId: competition._id,
      },
      session
    );

    let promotedRegistration = null;

    if (wasConfirmed) {
      // 5. Check for next eligible waitlisted participant (FIFO: earliest registeredAt, then _id)
      const nextWaitlisted = await Registration.findOne({
        competitionId,
        status: REGISTRATION_STATUS.WAITLISTED,
      })
        .sort({ registeredAt: 1, _id: 1 })
        .session(session);

      if (nextWaitlisted) {
        // Promote waitlisted participant
        nextWaitlisted.status = REGISTRATION_STATUS.CONFIRMED;
        nextWaitlisted.promotedAt = now;
        nextWaitlisted.waitlistPosition = null;
        await nextWaitlisted.save({ session });

        // Send promotion notification to promoted user
        await createNotification(
          {
            userId: nextWaitlisted.userId,
            type: 'WAITLIST_PROMOTION',
            title: 'Promoted from Waitlist!',
            message: `A spot opened up and you have been promoted to confirmed registration for "${competition.title}".`,
            competitionId: competition._id,
          },
          session
        );

        promotedRegistration = nextWaitlisted;
        // Spot is immediately transferred to the promoted user: registeredCount remains unchanged!
      } else {
        // No waitlist: atomically decrement competition spot count
        await Competition.findOneAndUpdate(
          {
            _id: competitionId,
            registeredCount: { $gt: 0 },
          },
          { $inc: { registeredCount: -1 } },
          { session, new: true }
        );
      }
    }

    const updatedComp = await Competition.findById(competitionId).session(session);
    const enrichedComp = enrichCompetition(updatedComp || competition, now);

    return {
      success: true,
      message: 'Registration successfully cancelled.',
      registration: registration.toObject ? registration.toObject() : registration,
      promotedParticipant: promotedRegistration
        ? promotedRegistration.toObject
          ? promotedRegistration.toObject()
          : promotedRegistration
        : null,
      competition: enrichedComp,
    };
  });
};

/**
 * Fetch all registered and waitlisted competitions for a specific user
 */
const getUserRegistrations = async (userId) => {
  const now = new Date();
  const registrations = await Registration.find({ userId })
    .populate('competitionId')
    .sort({ registeredAt: -1 })
    .lean();

  const formatted = registrations
    .filter((reg) => reg.competitionId !== null)
    .map((reg) => {
      const comp = reg.competitionId;
      const enrichedComp = enrichCompetition(comp, now);
      const isCancellable =
        now < new Date(comp.startDate) &&
        (reg.status === REGISTRATION_STATUS.CONFIRMED ||
          reg.status === REGISTRATION_STATUS.WAITLISTED);

      return {
        _id: reg._id,
        competitionId: comp._id,
        competitionTitle: comp.title,
        competitionCategory: comp.category,
        competitionLocation: comp.location,
        startDate: comp.startDate,
        endDate: comp.endDate,
        status: reg.status,
        waitlistPosition: reg.waitlistPosition,
        promotedAt: reg.promotedAt,
        registeredAt: reg.registeredAt,
        cancelledAt: reg.cancelledAt,
        participantDetails: reg.participantDetails,
        competition: enrichedComp,
        isCancellable,
      };
    });

  return formatted;
};

module.exports = {
  getRegistrationStatus,
  registerUser,
  joinWaitlistUser,
  cancelRegistration,
  getUserRegistrations,
};
