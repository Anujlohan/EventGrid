import { useState, useEffect, useCallback } from 'react';
import { competitionService } from '../services/competitionService';

export const useCompetition = (competitionId, activeUserId = null) => {
  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDetails = useCallback(
    async (isRefresh = false) => {
      if (!competitionId) return;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await competitionService.getCompetitionById(competitionId, activeUserId);
        setCompetition(data);
      } catch (err) {
        setError({
          message: err.message || 'Unable to load competition details.',
          status: err.status || 500,
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [competitionId, activeUserId]
  );

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const refresh = useCallback(() => {
    return fetchDetails(true);
  }, [fetchDetails]);

  return {
    competition,
    loading,
    refreshing,
    error,
    refresh,
    setCompetition,
  };
};
