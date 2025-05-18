import { useState, useEffect, useCallback } from 'react';
import type { TimelineEvent, TimelinePeriod } from '../types/TimelineEvent';
import { GitService } from '../services/GitService';
import { SpecStoryService } from '../services/SpecStoryService';
import { logger } from '../../utils/logging/logger';
import { TimelineAPIError } from '../../utils/api/errors';
import { useRepositoryStorage } from './useRepositoryStorage';
import { mockGitHistory } from '../mocks/mockGitHistory';
import { mockSpecHistory } from '../mocks/mockSpecHistory';

interface DataSourceState {
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
  lastAttempt: number | null;
  maxAutoRetries: number;
  autoRetryEnabled: boolean;
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

export function useTimelineData(baseUrl: string) {
  // Repository storage for caching
  const {
    // We don't use hasValidRepoData anymore as we always go through the server
    loadRepoData,
    saveRepoData,
    purgeRepoData
  } = useRepositoryStorage();

  // Track if we're using mocked data
  const [usingMockedData, setUsingMockedData] = useState(false);

  // Track if we've already attempted to fetch for this URL
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  // Track if we're currently fetching to prevent duplicate requests
  const [isFetching, setIsFetching] = useState(false);

  const [state, setState] = useState<TimelineDataState>({
    events: [],
    period: null,
    sources: {
      git: {
        isLoading: false,
        error: null,
        retryCount: 0,
        lastAttempt: null,
        maxAutoRetries: 0, // No auto retries
        autoRetryEnabled: false, // Auto retry disabled
      },
      spec: {
        isLoading: false,
        error: null,
        retryCount: 0,
        lastAttempt: null,
        maxAutoRetries: 0, // No auto retries
        autoRetryEnabled: false, // Auto retry disabled
      },
    },
  });

  const [filter, setFilter] = useState<TimelineFilter>({
    types: ['git', 'spec'],
  });

  // Initialize services
  const gitService = new GitService(API_BASE_URL, baseUrl || '', {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    timeout: 15000,
  });

  const specService = new SpecStoryService(API_BASE_URL, baseUrl || '', {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    timeout: 15000,
  });

  // Function to load mock data when no repository is provided or when explicitly requested
  const loadMockData = useCallback(() => {
    logger.info('data', 'Loading mock data');
    setUsingMockedData(true);

    const gitEvents = mockGitHistory();
    const specEvents = mockSpecHistory();

    const allEvents = [...gitEvents, ...specEvents];
    allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const period = allEvents.length > 0 ? {
      start: allEvents[0].timestamp,
      end: allEvents[allEvents.length - 1].timestamp,
      events: allEvents,
    } : null;

    setState(prev => ({
      ...prev,
      events: allEvents,
      period,
      sources: {
        git: {
          ...prev.sources.git,
          isLoading: false,
          error: null,
          retryCount: 0,
          lastAttempt: null,
        },
        spec: {
          ...prev.sources.spec,
          isLoading: false,
          error: null,
          retryCount: 0,
          lastAttempt: null,
        }
      }
    }));

    // Reset fetch attempt flag to prevent further automatic fetches
    setHasAttemptedFetch(true);

    // If we have a baseUrl, save the mock data to the cache with the isMocked flag
    if (baseUrl) {
      logger.info('data', 'Saving mock data to cache', { baseUrl });
      saveRepoData(baseUrl, gitEvents, specEvents, true);
    }

    // Log that we're using mocked data
    logger.info('data', 'Mock data loaded', {
      gitCount: gitEvents.length,
      specCount: specEvents.length,
      totalCount: allEvents.length,
      isMocked: true
    });

    // Ensure the mocked data flag is set
    setUsingMockedData(true);

    return { gitEvents, specEvents, allEvents, period };
  }, [baseUrl, saveRepoData, setHasAttemptedFetch]);

  const fetchSource = async (
    source: 'git' | 'spec',
    fetchFn: () => Promise<{ events: TimelineEvent[], cached: boolean }>
  ): Promise<{ events: TimelineEvent[], cached: boolean }> => {
    setState(prev => ({
      ...prev,
      sources: {
        ...prev.sources,
        [source]: {
          ...prev.sources[source],
          isLoading: true,
          lastAttempt: Date.now(),
        },
      },
    }));

    try {
      const result = await fetchFn();
      const { events, cached } = result;

      setState(prev => ({
        ...prev,
        sources: {
          ...prev.sources,
          [source]: {
            ...prev.sources[source],
            isLoading: false,
            error: null,
            retryCount: 0,
          },
        },
      }));

      logger.info('data', `Successfully fetched ${source} data`, {
        eventCount: events.length,
        cached
      });

      return result;
    } catch (error) {
      logger.error('data', `Failed to fetch ${source} data`, { error });

      setState(prev => ({
        ...prev,
        sources: {
          ...prev.sources,
          [source]: {
            ...prev.sources[source],
            isLoading: false,
            error: error instanceof Error ? error : new Error('Unknown error occurred'),
            retryCount: prev.sources[source].retryCount + 1,
          },
        },
      }));

      return { events: [], cached: false };
    }
  };

  const fetchTimelineData = useCallback(async (
    sourceToRetry?: 'git' | 'spec',
    // We always fetch from server, but keep param for API compatibility
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _: boolean = false
  ) => {
    // Prevent duplicate requests
    if (isFetching) {
      logger.info('data', 'Already fetching data, skipping duplicate request');
      return;
    }

    // Set fetching flag
    setIsFetching(true);

    // Reset mocked data flag
    setUsingMockedData(false);

    // Skip if no repository URL is provided
    if (!baseUrl) {
      logger.warn('data', 'Empty repository URL, skipping fetch');
      // Load mock data when no repo URL is provided
      loadMockData();
      setIsFetching(false);
      return;
    }

    try {
      // Validate the repository URL format if provided
      if (!baseUrl || baseUrl.trim() === '') {
        logger.error('data', 'Empty repository URL', { baseUrl });
        throw new TimelineAPIError('Repository URL is required. Please enter a valid URL.');
      }

      // Log the repository URL being used
      logger.info('data', 'Using repository URL for data fetch', { baseUrl });

      const shouldFetchGit = sourceToRetry
        ? sourceToRetry === 'git'
        : filter.types?.includes('git');

      const shouldFetchSpec = sourceToRetry
        ? sourceToRetry === 'spec'
        : filter.types?.includes('spec');

      const gitPromise = shouldFetchGit
        ? fetchSource('git', () =>
            gitService.fetchGitHistory(filter.startDate, filter.endDate)
          )
        : Promise.resolve({
            events: state.events.filter(e => e.type === 'git'),
            cached: true
          });

      const specPromise = shouldFetchSpec
        ? fetchSource('spec', () =>
            specService.fetchSpecHistory(filter.startDate, filter.endDate)
          )
        : Promise.resolve({
            events: state.events.filter(e => e.type === 'spec'),
            cached: true
          });

      // Use Promise.allSettled to handle partial failures
      const results = await Promise.allSettled([gitPromise, specPromise]);

      // Extract successful results with proper type handling
      const gitResult = results[0].status === 'fulfilled' ? results[0].value : { events: [], cached: false, mocked: false };
      const specResult = results[1].status === 'fulfilled' ? results[1].value : { events: [], cached: false, mocked: false };

      const gitEvents = gitResult.events;
      const specEvents = specResult.events;

      // Check if either result is marked as mocked
      const gitMocked = 'mocked' in gitResult ? gitResult.mocked : false;
      const specMocked = 'mocked' in specResult ? specResult.mocked : false;
      const isMocked = gitMocked || specMocked;

      // Set the mocked data flag if either source is mocked
      if (isMocked) {
        setUsingMockedData(true);
        logger.info('data', 'Using mocked data from server', {
          gitMocked,
          specMocked
        });
      }

      const isCached = gitResult.cached && specResult.cached;

      // Log any rejected promises
      if (results[0].status === 'rejected') {
        logger.error('data', 'Git data fetch failed', { error: results[0].reason });
      }
      if (results[1].status === 'rejected') {
        logger.error('data', 'Spec data fetch failed', { error: results[1].reason });
      }

      const allEvents = [...gitEvents, ...specEvents];

      // Sort events by timestamp
      allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Filter by search term if present
      const filteredEvents = filter.searchTerm
        ? allEvents.filter(event => {
            const searchLower = filter.searchTerm!.toLowerCase();
            return event.title.toLowerCase().includes(searchLower) ||
                   event.description?.toLowerCase().includes(searchLower);
          })
        : allEvents;

      // Calculate period
      const period = filteredEvents.length > 0 ? {
        start: filteredEvents[0].timestamp,
        end: filteredEvents[filteredEvents.length - 1].timestamp,
        events: filteredEvents,
      } : null;

      // Update state with new data
      setState(prev => ({
        ...prev,
        events: filteredEvents,
        period,
      }));

      // Save to cache if we have data
      if (gitEvents.length > 0 || specEvents.length > 0) {
        // Pass the mocked flag to the storage
        saveRepoData(baseUrl, gitEvents, specEvents, isMocked);
      }

      logger.info('data', 'Timeline data updated', {
        gitCount: gitEvents.length,
        specCount: specEvents.length,
        totalCount: filteredEvents.length,
        isCached: isCached,
        isMocked: isMocked
      });

      // Reset fetching flag
      setIsFetching(false);
    } catch (error) {
      logger.error('data', 'Failed to update timeline data', { error });

      // Set both sources to error state if there's a global error
      setState(prev => ({
        ...prev,
        sources: {
          git: {
            ...prev.sources.git,
            isLoading: false,
            error: error instanceof Error ? error : new Error('Unknown error occurred'),
          },
          spec: {
            ...prev.sources.spec,
            isLoading: false,
            error: error instanceof Error ? error : new Error('Unknown error occurred'),
          }
        }
      }));

      // No auto-retries - user must explicitly retry or use mocked data
      logger.info('data', 'Network error occurred, waiting for user action', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // If we have no data at all, we could offer to load mock data
      if (state.events.length === 0) {
        logger.info('data', 'No data available, user can load mock data');
      }

      // Reset fetching flag even on error
      setIsFetching(false);

      // Don't throw here, let the UI handle the error state
    }
  }, [filter, gitService, specService, state.events, state.sources.git.retryCount, state.sources.spec.retryCount,
      state.sources.git.autoRetryEnabled, state.sources.spec.autoRetryEnabled,
      state.sources.git.maxAutoRetries, state.sources.spec.maxAutoRetries,
      baseUrl, loadRepoData, saveRepoData, isFetching, loadMockData, setIsFetching]);

  // Only fetch data when baseUrl changes or on explicit refresh
  useEffect(() => {
    if (!baseUrl) {
      logger.warn('data', 'Empty repository URL, skipping fetch');
      return;
    }
    if (!hasAttemptedFetch) {
      logger.info('data', 'Base URL changed or initial mount, fetching timeline data', { baseUrl });
      setHasAttemptedFetch(true); // Set BEFORE fetch to prevent loops
      fetchTimelineData(undefined, true);
    }
  }, [baseUrl, hasAttemptedFetch, fetchTimelineData]);

  const updateFilter = useCallback((newFilter: Partial<TimelineFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  const retrySource = useCallback((source: 'git' | 'spec') => {
    logger.info('data', `Retrying ${source} data fetch`);
    return fetchTimelineData(source);
  }, [fetchTimelineData]);

  const isLoading = state.sources.git.isLoading || state.sources.spec.isLoading;
  const hasError = state.sources.git.error || state.sources.spec.error;
  const errors = {
    git: state.sources.git.error,
    spec: state.sources.spec.error,
  };

  // Create a refresh function that forces a refresh
  const refresh = useCallback(() => {
    logger.info('data', 'Forcing refresh of timeline data');
    // Reset the fetch attempt flag to allow a new fetch
    setHasAttemptedFetch(false);
    return fetchTimelineData(undefined, true);
  }, [fetchTimelineData, setHasAttemptedFetch]);

  // Create a purge function that clears the cache for the current repo and forces a refresh
  const purgeAndRefresh = useCallback(() => {
    if (!baseUrl) {
      logger.warn('data', 'Empty repository URL, skipping purge');
      return;
    }

    logger.info('data', 'Purging repository data and forcing refresh', { baseUrl });

    // Purge the repository data
    purgeRepoData(baseUrl);

    // Reset the fetch attempt flag to allow a new fetch
    setHasAttemptedFetch(false);

    // Reset the state to clear any existing data
    setState(prev => ({
      ...prev,
      events: [],
      period: null,
      sources: {
        git: {
          ...prev.sources.git,
          isLoading: true,
          error: null,
          retryCount: 0,
          lastAttempt: null,
        },
        spec: {
          ...prev.sources.spec,
          isLoading: true,
          error: null,
          retryCount: 0,
          lastAttempt: null,
        }
      }
    }));

    // Force a refresh
    return fetchTimelineData(undefined, true);
  }, [baseUrl, purgeRepoData, fetchTimelineData, setHasAttemptedFetch]);

  return {
    events: state.events,
    period: state.period,
    isLoading,
    hasError,
    errors,
    sources: state.sources,
    filter,
    updateFilter,
    refresh,
    purgeAndRefresh,
    retry: retrySource,
    usingMockedData,
  };
}
