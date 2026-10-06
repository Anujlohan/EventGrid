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
    const userId = req.user?.userId || null;
    const competition = await competitionService.getCompetitionById(id, userId);
    return successResponse(res, 200, competition, 'Competition details retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

const createCompetition = async (req, res, next) => {
  try {
    const creatorId = req.user?.userId;
    const competition = await competitionService.createCompetition(req.body, creatorId);
    return successResponse(res, 201, competition, 'Competition created successfully.');
  } catch (error) {
    next(error);
  }
};

const updateCompetition = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await competitionService.updateCompetition(id, req.body, req.user);
    return successResponse(res, 200, updated, 'Competition updated successfully.');
  } catch (error) {
    next(error);
  }
};

const deleteCompetition = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await competitionService.deleteCompetition(id, req.user, req.body);
    return successResponse(res, 200, result, result.message);
  } catch (error) {
    next(error);
  }
};

const getCompetitionParticipants = async (req, res, next) => {
  try {
    const { id } = req.params;
    const roster = await competitionService.getCompetitionParticipants(id, req.user, req.query);
    return successResponse(res, 200, roster, 'Participant roster retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const data = competitionService.getEventCategories();
    return successResponse(res, 200, data, 'Event categories retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompetitions,
  getCompetitionById,
  createCompetition,
  updateCompetition,
  deleteCompetition,
  getCompetitionParticipants,
  getCategories,
};
