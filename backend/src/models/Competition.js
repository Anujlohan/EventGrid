const mongoose = require('mongoose');
const { LIFECYCLE_STATUS } = require('../constants/competitionStatus');

const competitionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Competition title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Competition description is required'],
      trim: true,
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [300, 'Short description cannot exceed 300 characters'],
    },
    image: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
      index: true,
    },
    subcategory: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    sportType: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isLegacy: {
      type: Boolean,
      default: false,
      index: true,
    },
    legacyOwnerUnassigned: {
      type: Boolean,
      default: false,
    },
    isCancelled: {
      type: Boolean,
      default: false,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: '',
      trim: true,
    },
    organizer: {
      type: String,
      default: 'Organizer',
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Online', 'In-person', 'Hybrid'],
        default: 'Online',
      },
      venue: {
        type: String,
        default: '',
        trim: true,
      },
      city: {
        type: String,
        default: '',
        trim: true,
      },
      address: {
        type: String,
        default: '',
        trim: true,
      },
    },
    registrationStartDate: {
      type: Date,
      required: [true, 'Registration start date is required'],
    },
    registrationDeadline: {
      type: Date,
      required: [true, 'Registration deadline is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Competition start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'Competition end date is required'],
    },
    totalSpots: {
      type: Number,
      required: [true, 'Total spots is required'],
      min: [1, 'Total spots must be at least 1'],
    },
    registeredCount: {
      type: Number,
      default: 0,
      min: [0, 'Registered count cannot be negative'],
    },
    entryFee: {
      type: String,
      default: 'Free',
      trim: true,
    },
    prizePool: {
      type: String,
      default: '',
      trim: true,
    },
    rules: {
      type: [String],
      default: [],
    },
    eligibility: {
      type: String,
      default: '',
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    customRegistrationFields: [
      {
        fieldName: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
        required: { type: Boolean, default: false },
        type: { type: String, default: 'text' },
      },
    ],
    status: {
      type: String,
      enum: Object.values(LIFECYCLE_STATUS),
      default: LIFECYCLE_STATUS.UPCOMING,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Strict date constraint validation
competitionSchema.pre('validate', function (next) {
  if (this.registrationStartDate && this.registrationDeadline) {
    if (new Date(this.registrationStartDate) > new Date(this.registrationDeadline)) {
      return next(new Error('registrationStartDate must be less than or equal to registrationDeadline'));
    }
  }
  if (this.registrationDeadline && this.startDate) {
    if (new Date(this.registrationDeadline) >= new Date(this.startDate)) {
      return next(new Error('registrationDeadline must be strictly before startDate'));
    }
  }
  if (this.startDate && this.endDate) {
    if (new Date(this.startDate) > new Date(this.endDate)) {
      return next(new Error('startDate must be less than or equal to endDate'));
    }
  }
  next();
});

// Indexes for query optimization
competitionSchema.index({ startDate: 1, endDate: 1 });
competitionSchema.index({ registrationStartDate: 1, registrationDeadline: 1 });
competitionSchema.index({ category: 1, status: 1 });
competitionSchema.index({ category: 1, sportType: 1 });
competitionSchema.index({ category: 1, subcategory: 1 });

const Competition = mongoose.model('Competition', competitionSchema);

module.exports = Competition;
