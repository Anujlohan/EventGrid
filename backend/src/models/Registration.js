const mongoose = require('mongoose');
const { REGISTRATION_STATUS } = require('../constants/competitionStatus');

const registrationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for registration'],
      index: true,
    },
    competitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competition',
      required: [true, 'Competition ID is required for registration'],
      index: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    participantDetails: {
      fullName: {
        type: String,
        default: '',
        trim: true,
      },
      email: {
        type: String,
        default: '',
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        default: '',
        trim: true,
      },
      customFields: {
        type: Map,
        of: String,
        default: {},
      },
    },
    status: {
      type: String,
      enum: Object.values(REGISTRATION_STATUS),
      default: REGISTRATION_STATUS.CONFIRMED,
    },
    waitlistPosition: {
      type: Number,
      default: null,
    },
    promotedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Strict Unique Compound Index: exactly ONE registration record per user per competition
registrationSchema.index({ userId: 1, competitionId: 1 }, { unique: true });

const Registration = mongoose.model('Registration', registrationSchema);

module.exports = Registration;
