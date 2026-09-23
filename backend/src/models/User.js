const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      minlength: [7, 'Phone number must be at least 7 digits'],
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Do not return in queries by default
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['Participant', 'Organizer', 'Admin'],
      default: 'Participant',
    },
    college: {
      type: String,
      trim: true,
      default: '',
    },
    organization: {
      type: String,
      trim: true,
      default: '',
    },
    experienceLevel: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password candidate with bcrypt hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword || typeof candidatePassword !== 'string') {
    return false;
  }
  // Retrieve password hash from current doc or query explicitly if select: false
  const passwordHash =
    this.password ||
    (await this.constructor.findById(this._id).select('+password'))?.password;

  if (!passwordHash) {
    return false;
  }
  return bcrypt.compare(candidatePassword, passwordHash);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
