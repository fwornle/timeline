import { useState, useEffect, useCallback } from 'react';
import type { TimelineEvent, TimelinePeriod } from '../types/TimelineEvent';
import { GitService } from '../services/GitService';
import { SpecStoryService } from '../services/SpecStoryService';
import { logger } from '../../utils/logging/logger';
import { TimelineAPIError } from '../../utils/api/errors';
import { useRepositoryStorage } from './useRepositoryStorage';

interface DataSourceState {
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
  lastAttempt: number | null;
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
    hasValidRepoData,
    loadRepoData,
    saveRepoData
  } = useRepositoryStorage();

  const [state, setState] = useState<TimelineDataState>({
    events: [],
    period: null,
    sources: {
      git: {
        isLoading: false,
        error: null,
        retryCount: 0,
        lastAttempt: null,
      },
      spec: {
        isLoading: false,
        error: null,
        retryCount: 0,
        lastAttempt: null,
      },
    },
  });

  const [filter, setFilter] = useState<TimelineFilter>({
    types: ['git', 'spec'],
  });

  // Check for cached data on initial load
  useEffect(() => {
    if (!baseUrl) {
      logger.warn('data', 'Empty repository URL, skipping fetch');
      return;
    }

    if (hasValidRepoData(baseUrl)) {
      const cachedData = loadRepoData(baseUrl);
      if (cachedData) {
        logger.info('data', 'Using cached repository data', {
          baseUrl,
          gitEventsCount: cachedData.gitEvents.length,
          specEventsCount: cachedData.specEvents.length
        });

        // Convert dates from strings back to Date objects
        const gitEvents = cachedData.gitEvents.map(event => ({
          ...event,
          timestamp: new Date(event.timestamp)
        }));

        const specEvents = cachedData.specEvents.map(event => ({
          ...event,
          timestamp: new Date(event.timestamp)
        }));

        // Calculate period
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
        }));
      }
    }
  }, [baseUrl, hasValidRepoData, loadRepoData]);

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

  const fetchSource = async (
    source: 'git' | 'spec',
    fetchFn: () => Promise<TimelineEvent[]>
  ): Promise<TimelineEvent[]> => {
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
      const events = await fetchFn();

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
        eventCount: events.length
      });

      return events;
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

      return [];
    }
  };

  const fetchTimelineData = useCallback(async (
    sourceToRetry?: 'git' | 'spec',
    forceRefresh = false
  ) => {
    // Skip if no repository URL is provided
    if (!baseUrl) {
      logger.warn('data', 'Empty repository URL, skipping fetch');
      return;
    }

    // Check cache first unless force refresh is requested
    if (!forceRefresh && hasValidRepoData(baseUrl)) {
      logger.info('data', 'Using cached repository data', { baseUrl });
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
        : Promise.resolve(state.events.filter(e => e.type === 'git'));

      const specPromise = shouldFetchSpec
        ? fetchSource('spec', () =>
            specService.fetchSpecHistory(filter.startDate, filter.endDate)
          )
        : Promise.resolve(state.events.filter(e => e.type === 'spec'));

      // Use Promise.allSettled to handle partial failures
      const results = await Promise.allSettled([gitPromise, specPromise]);

      // Extract successful results
      const gitEvents = results[0].status === 'fulfilled' ? results[0].value : [];
      const specEvents = results[1].status === 'fulfilled' ? results[1].value : [];

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
        saveRepoData(baseUrl, gitEvents, specEvents);
      }

      logger.info('data', 'Timeline data updated', {
        gitCount: gitEvents.length,
        specCount: specEvents.length,
        totalCount: filteredEvents.length
      });
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

      // Don't throw here, let the UI handle the error state
    }
  }, [filter, gitService, specService, state.events, baseUrl, hasValidRepoData, loadRepoData, saveRepoData]);

  // Only fetch data when baseUrl changes or on explicit refresh
  useEffect(() => {
    if (baseUrl) {
      fetchTimelineData();
    }
  }, [baseUrl, fetchTimelineData]);

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
    return fetchTimelineData(undefined, true);
  }, [fetchTimelineData]);

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
    retry: retrySource,
  };
}
