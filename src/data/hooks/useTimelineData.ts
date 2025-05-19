import { useState, useEffect, useCallback } from 'react';
import type { TimelineEvent, TimelinePeriod } from '../types/TimelineEvent';
import { GitService } from '../services/GitService';
import { SpecStoryService } from '../services/SpecStoryService';
import { logger } from '../../utils/logging/logger';

interface DataSourceState {
  isLoading: boolean;
  error: Error | null;
}

interface TimelineDataState {
  events: TimelineEvent[];
  period: TimelinePeriod | null;
  sources: {
    git: DataSourceState;
    spec: DataSourceState;
  };
}

interface TimelineFilter {
  types?: Array<'git' | 'spec'>;
  searchTerm?: string;
  startDate?: Date;
  endDate?: Date;
}

// API base URL
const API_BASE_URL = 'http://localhost:3030/api/v1';

export function useTimelineData(repoUrl: string) {
  // State
  const [state, setState] = useState<TimelineDataState>({
    events: [],
    period: null,
    sources: {
      git: { isLoading: false, error: null },
      spec: { isLoading: false, error: null }
    }
  });

  const [filter, setFilter] = useState<TimelineFilter>({
    types: ['git', 'spec']
  });

  const [isFetching, setIsFetching] = useState(false);
  const [usingMockedData, setUsingMockedData] = useState(false);
  const [hasInitialFetch, setHasInitialFetch] = useState(false);

  // Initialize services - memoize to prevent recreation
  const gitService = useCallback(() => new GitService(API_BASE_URL, repoUrl), [repoUrl]);
  const specService = useCallback(() => new SpecStoryService(API_BASE_URL, repoUrl), [repoUrl]);

  // Fetch data from server
  const fetchTimelineData = useCallback(async (force = false) => {
    // Skip if already fetching or no repo URL
    if (!repoUrl || (isFetching && !force)) {
      return;
    }

    // Skip if we already have data and this isn't a forced refresh
    if (hasInitialFetch && !force) {
      return;
    }

    setIsFetching(true);
    setState(prev => ({
      ...prev,
      sources: {
        git: { isLoading: true, error: null },
        spec: { isLoading: true, error: null }
      }
    }));

    try {
      // Fetch both git and spec data in parallel
      const [gitResult, specResult] = await Promise.all([
        gitService().fetchGitHistory(),
        specService().fetchSpecHistory()
      ]);

      // Check if either result is mocked
      setUsingMockedData(gitResult.mocked || specResult.mocked);

      // Combine and sort events
      const allEvents = [...gitResult.events, ...specResult.events]
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Calculate period
      const period = allEvents.length > 0 ? {
        start: allEvents[0].timestamp,
        end: allEvents[allEvents.length - 1].timestamp,
        events: allEvents
      } : null;

      setState({
        events: allEvents,
        period,
        sources: {
          git: { isLoading: false, error: null },
          spec: { isLoading: false, error: null }
        }
      });

      setHasInitialFetch(true);
    } catch (error) {
      logger.error('data', 'Failed to fetch timeline data', { error });
      setState(prev => ({
        ...prev,
        sources: {
          git: { isLoading: false, error: error as Error },
          spec: { isLoading: false, error: error as Error }
        }
      }));
    } finally {
      setIsFetching(false);
    }
  }, [repoUrl, gitService, specService]);

  // Initial data fetch - only once when repoUrl changes
  useEffect(() => {
    // Skip if no repo URL or already fetching
    if (!repoUrl || isFetching) {
      return;
    }

    // Skip if we already have data
    if (hasInitialFetch) {
      return;
    }

    logger.info('data', 'Initial fetch for repository', { repoUrl });
    
    // Start the fetch process
    const doFetch = async () => {
      setIsFetching(true);
      try {
        const [gitResult, specResult] = await Promise.all([
          gitService().fetchGitHistory(),
          specService().fetchSpecHistory()
        ]);

        setUsingMockedData(gitResult.mocked || specResult.mocked);

        const allEvents = [...gitResult.events, ...specResult.events]
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        const period = allEvents.length > 0 ? {
          start: allEvents[0].timestamp,
          end: allEvents[allEvents.length - 1].timestamp,
          events: allEvents
        } : null;

        setState({
          events: allEvents,
          period,
          sources: {
            git: { isLoading: false, error: null },
            spec: { isLoading: false, error: null }
          }
        });
      } catch (error) {
        logger.error('data', 'Failed to fetch timeline data', { error });
        setState(prev => ({
          ...prev,
          sources: {
            git: { isLoading: false, error: error as Error },
            spec: { isLoading: false, error: error as Error }
          }
        }));
      } finally {
        setIsFetching(false);
        setHasInitialFetch(true);
      }
    };

    doFetch();
  }, [repoUrl, isFetching, hasInitialFetch, gitService, specService]); // Include all dependencies

  // Function to purge cache and reload data
  const purgeAndRefresh = useCallback(async (hardPurge = false) => {
    if (!repoUrl || isFetching) {
      return;
    }

    setIsFetching(true);
    setState(prev => ({
      ...prev,
      sources: {
        git: { isLoading: true, error: null },
        spec: { isLoading: true, error: null }
      }
    }));

    try {
      // Send POST request to purge cache
      const endpoint = hardPurge ? `${API_BASE_URL}/purge/hard` : `${API_BASE_URL}/purge`;
      const response = await fetch(`${endpoint}?repository=${encodeURIComponent(repoUrl)}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to purge cache');
      }

      // Wait a bit to ensure the cache is cleared
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch fresh data
      const [gitResult, specResult] = await Promise.all([
        gitService().fetchGitHistory(),
        specService().fetchSpecHistory()
      ]);

      setUsingMockedData(gitResult.mocked || specResult.mocked);

      const allEvents = [...gitResult.events, ...specResult.events]
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      const period = allEvents.length > 0 ? {
        start: allEvents[0].timestamp,
        end: allEvents[allEvents.length - 1].timestamp,
        events: allEvents
      } : null;

      setState({
        events: allEvents,
        period,
        sources: {
          git: { isLoading: false, error: null },
          spec: { isLoading: false, error: null }
        }
      });
    } catch (error) {
      logger.error('data', `Failed to ${hardPurge ? 'hard ' : ''}purge and refresh data`, { error });
      setState(prev => ({
        ...prev,
        sources: {
          git: { isLoading: false, error: error as Error },
          spec: { isLoading: false, error: error as Error }
        }
      }));
    } finally {
      setIsFetching(false);
    }
  }, [repoUrl, isFetching, gitService, specService]);

  // Convenience method for hard reload
  const hardPurgeAndRefresh = useCallback(() => {
    return purgeAndRefresh(true);
  }, [purgeAndRefresh]);

  const updateFilter = useCallback((newFilter: Partial<TimelineFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  const hardReload = useCallback(async () => {
    if (!repoUrl) return;
    
    setIsFetching(true);
    setState(prev => ({
      ...prev,
      sources: {
        git: { isLoading: true, error: null },
        spec: { isLoading: true, error: null }
      }
    }));
    
    try {
      // First purge the cache
      const purgeResponse = await fetch(`${API_BASE_URL}/purge/hard?repository=${encodeURIComponent(repoUrl)}`, {
        method: 'POST'
      });

      if (!purgeResponse.ok) {
        throw new Error(`Failed to purge cache: ${await purgeResponse.text()}`);
      }

      // Wait a bit for the server to clean up
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Then reload the data
      const [gitResult, specResult] = await Promise.all([
        gitService().fetchGitHistory(),
        specService().fetchSpecHistory()
      ]);

      // Update state with new data
      const allEvents = [...gitResult.events, ...specResult.events]
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      const period = allEvents.length > 0 ? {
        start: allEvents[0].timestamp,
        end: allEvents[allEvents.length - 1].timestamp,
        events: allEvents
      } : null;

      setState({
        events: allEvents,
        period,
        sources: {
          git: { isLoading: false, error: null },
          spec: { isLoading: false, error: null }
        }
      });

      setUsingMockedData(gitResult.mocked || specResult.mocked);
    } catch (error) {
      console.error('Error during hard reload:', error);
      setState(prev => ({
        ...prev,
        sources: {
          git: { isLoading: false, error: error as Error },
          spec: { isLoading: false, error: error as Error }
        }
      }));
    } finally {
      setIsFetching(false);
    }
  }, [repoUrl, gitService, specService]);

  // Return stable interface
  return {
    events: state.events,
    period: state.period,
    isLoading: isFetching,
    hasError: Boolean(state.sources.git.error || state.sources.spec.error),
    errors: {
      git: state.sources.git.error,
      spec: state.sources.spec.error
    },
    sources: state.sources,
    filter,
    updateFilter,
    refresh: fetchTimelineData,
    purgeAndRefresh,
    hardPurgeAndRefresh,
    usingMockedData,
    hardReload
  };
}
