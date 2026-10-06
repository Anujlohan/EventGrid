const User = require('../models/User');
const AppError = require('./appError');

/**
 * Trusted administrative process to provision Admin accounts.
 * Admin accounts cannot be created via public registration.
 *
 * @param {Object} adminData
 * @param {string} adminData.name
 * @param {string} adminData.email
 * @param {string} adminData.phoneNumber
 * @param {string} adminData.password
 * @param {string} [adminData.college]
 * @param {string} [adminData.organization]
 * @param {string} [adminData.experienceLevel]
 * @returns {Promise<Object>} Created admin user document (safe JSON)
 */
const provisionAdminUser = async (adminData) => {
  const { name, email, phoneNumber, password, college = '', organization = '', experienceLevel = '' } = adminData;

  if (!name || !name.trim()) {
    throw new AppError('Admin full name is required.', 400);
  }
  if (!email || !email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    throw new AppError('A valid email address is required.', 400);
  }
  if (!phoneNumber || !phoneNumber.trim()) {
    throw new AppError('Phone number is required.', 400);
  }
  if (!password || password.length < 6) {
    throw new AppError('Password must be at least 6 characters long.', 400);
  }

  const cleanEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    throw new AppError(`User with email "${cleanEmail}" already exists.`, 409);
  }

  const adminUser = await User.create({
    name: name.trim(),
    email: cleanEmail,
    phoneNumber: phoneNumber.trim(),
    password,
    role: 'Admin',
    college: college.trim(),
    organization: organization.trim(),
    experienceLevel: experienceLevel.trim(),
  });

  return adminUser.toJSON();
};

module.exports = {
  provisionAdminUser,
};
