import { api } from './api';

export const competitionService = {
  /**
   * Fetch all competitions with optional status/category filtering
   */
  getCompetitions: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.sportType && params.sportType !== 'All') query.append('sportType', params.sportType);
    if (params.subcategory && params.subcategory !== 'All') query.append('subcategory', params.subcategory);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.search && typeof params.search === 'string' && params.search.trim()) {
      query.append('search', params.search.trim());
    }
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.order) query.append('order', params.order);
    if (params.sort) query.append('sort', params.sort);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const queryString = query.toString();
    const endpoint = `/competitions${queryString ? `?${queryString}` : ''}`;
    return await api.get(endpoint);
  },

  /**
   * Fetch category taxonomy with sports subcategories
   */
  getCategories: async () => {
    return await api.get('/competitions/categories');
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

  /**
   * Fetch participant roster for a competition (Creator or Admin only)
   */
  getCompetitionParticipants: async (competitionId, params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.status && params.status !== 'All') query.append('status', params.status);

    const queryString = query.toString();
    const endpoint = `/competitions/${competitionId}/participants${queryString ? `?${queryString}` : ''}`;
    return await api.get(endpoint);
  },
};
