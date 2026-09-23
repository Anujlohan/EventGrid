import { api } from './api';

export const competitionService = {
  /**
   * Fetch all competitions with optional status/category filtering
   */
  getCompetitions: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.category) query.append('category', params.category);
    if (params.status) query.append('status', params.status);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const queryString = query.toString();
    const endpoint = `/competitions${queryString ? `?${queryString}` : ''}`;
    return await api.get(endpoint);
  },

  /**
   * Fetch single competition details by ID, including dynamic lifecycle and authenticated registration status
   */
  getCompetitionById: async (id) => {
    return await api.get(`/competitions/${id}`);
  },

  /**
   * Register authenticated user for a competition via ACID transaction with participant details
   */
  registerUser: async (competitionId, participantDetails = {}) => {
    return await api.post(`/competitions/${competitionId}/register`, {
      participantDetails,
    });
  },

  /**
   * Cancel authenticated user's registration for a competition via ACID transaction
   */
  cancelRegistration: async (competitionId) => {
    return await api.delete(`/competitions/${competitionId}/register`);
  },

  /**
   * Fetch all registrations belonging to the currently authenticated user
   */
  getMyRegistrations: async () => {
    return await api.get('/competitions/registrations/my');
  },

  /**
   * Create a new real competition in MongoDB (requires organizer authentication)
   */
  createCompetition: async (competitionData) => {
    return await api.post('/competitions', competitionData);
  },
};
