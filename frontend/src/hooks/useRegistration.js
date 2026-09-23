import { useState } from 'react';
import { competitionService } from '../services/competitionService';

export const useRegistration = (onSuccess) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const register = async (competitionId, participantDetails = {}) => {
    if (!competitionId) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const result = await competitionService.registerUser(competitionId, participantDetails);
      if (onSuccess) {
        onSuccess(result.competition, { isRegistered: true, registration: result.registration }, 'Registration successful!');
      }
      return result;
    } catch (err) {
      const errorMsg = err.message || 'Failed to complete registration.';
      setActionError(errorMsg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancel = async (competitionId) => {
    if (!competitionId) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const result = await competitionService.cancelRegistration(competitionId);
      if (onSuccess) {
        onSuccess(result.competition, { isRegistered: false, registration: null }, 'Registration cancelled.');
      }
      return result;
    } catch (err) {
      const errorMsg = err.message || 'Failed to cancel registration.';
      setActionError(errorMsg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    actionError,
    setActionError,
    register,
    cancel,
  };
};
