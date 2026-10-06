const Competition = require('../models/Competition');

/**
 * Filter for legacy competition records that have not yet been audited/migrated
 */
const getUnmigratedLegacyFilter = () => ({
  $and: [
    { $or: [{ createdBy: { $exists: false } }, { createdBy: null }] },
    { $or: [{ isLegacy: { $exists: false } }, { isLegacy: false }] },
  ],
});

/**
 * Filter for all legacy records (both migrated and unmigrated) lacking createdBy
 */
const getAllLegacyFilter = () => ({
  $or: [{ createdBy: { $exists: false } }, { createdBy: null }],
});

/**
 * Audits existing competition records for missing or null createdBy field.
 *
 * @returns {Promise<Object>} { totalRecords, legacyCount, unmigratedCount, validCount, legacyCompetitions }
 */
const auditLegacyCompetitions = async () => {
  const [totalRecords, allLegacyRecords, unmigratedRecords] = await Promise.all([
    Competition.countDocuments({}),
    Competition.find(getAllLegacyFilter()).select('_id title isLegacy createdBy createdAt').lean(),
    Competition.find(getUnmigratedLegacyFilter()).select('_id title isLegacy createdBy').lean(),
  ]);

  return {
    totalRecords,
    legacyCount: allLegacyRecords.length,
    unmigratedCount: unmigratedRecords.length,
    validCount: totalRecords - allLegacyRecords.length,
    legacyCompetitions: allLegacyRecords,
  };
};

/**
 * Safely migrates legacy competition records without inventing owners.
 * Flags unmigrated legacy records with isLegacy: true and legacyOwnerUnassigned: true.
 *
 * @returns {Promise<Object>} { audited, migratedCount, alreadyClean }
 */
const migrateLegacyCompetitions = async () => {
  const audit = await auditLegacyCompetitions();

  if (audit.unmigratedCount === 0) {
    return {
      audited: audit.totalRecords,
      legacyCount: audit.legacyCount,
      migratedCount: 0,
      alreadyClean: true,
    };
  }

  // Safely mark legacy records explicitly without inventing fake owners
  const updateResult = await Competition.updateMany(getUnmigratedLegacyFilter(), {
    $set: {
      isLegacy: true,
      legacyOwnerUnassigned: true,
    },
  });

  return {
    audited: audit.totalRecords,
    legacyCount: audit.legacyCount,
    migratedCount: updateResult.modifiedCount,
    alreadyClean: false,
  };
};

module.exports = {
  auditLegacyCompetitions,
  migrateLegacyCompetitions,
  getUnmigratedLegacyFilter,
  getAllLegacyFilter,
};
