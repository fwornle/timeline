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
  const purgeAndRefresh = useCallback(async () => {
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
      const response = await fetch(`${API_BASE_URL}/purge?repository=${encodeURIComponent(repoUrl)}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to purge cache');
      }

      // Wait a bit to ensure the cache is cleared
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reset hasInitialFetch to allow a new fetch
      setHasInitialFetch(false);

      // Fetch fresh data
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

        // Set hasInitialFetch back to true after successful fetch
        setHasInitialFetch(true);
      } catch (fetchError) {
        logger.error('data', 'Failed to fetch data after purge', { error: fetchError });
        setState(prev => ({
          ...prev,
          sources: {
            git: { isLoading: false, error: fetchError as Error },
            spec: { isLoading: false, error: fetchError as Error }
          }
        }));
        // Set hasInitialFetch back to true even on error to prevent loops
        setHasInitialFetch(true);
      }
    } catch (purgeError) {
      logger.error('data', 'Failed to purge cache', { error: purgeError });
      setState(prev => ({
        ...prev,
        sources: {
          git: { isLoading: false, error: purgeError as Error },
          spec: { isLoading: false, error: purgeError as Error }
        }
      }));
      // Set hasInitialFetch back to true on error to prevent loops
      setHasInitialFetch(true);
    } finally {
      setIsFetching(false);
    }
  }, [repoUrl, isFetching, gitService, specService]);

  const updateFilter = useCallback((newFilter: Partial<TimelineFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

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
    refresh: () => fetchTimelineData(true),
    purgeAndRefresh,
    usingMockedData
  };
}
