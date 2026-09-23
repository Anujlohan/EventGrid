const competitionService = require('../services/competitionService');
const { successResponse } = require('../utils/apiResponse');

const getCompetitions = async (req, res, next) => {
  try {
    const result = await competitionService.getAllCompetitions(req.query);
    return successResponse(res, 200, result, 'Competitions retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

const getCompetitionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.query.userId || null;
    const competition = await competitionService.getCompetitionById(id, userId);
    return successResponse(res, 200, competition, 'Competition details retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

const createCompetition = async (req, res, next) => {
  try {
    const competition = await competitionService.createCompetition(req.body);
    return successResponse(res, 201, competition, 'Competition created successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompetitions,
  getCompetitionById,
  createCompetition,
};
