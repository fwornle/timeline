import { useState, useEffect, useCallback } from 'react';
import type { TimelineEvent, TimelinePeriod } from '../types/TimelineEvent';
import { GitService } from '../services/GitService';
import { SpecStoryService } from '../services/SpecStoryService';
import { logger } from '../../utils/logging/logger';
import { TimelineAPIError } from '../../utils/api/errors';

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

import { initialConfig } from '../../config/config';

export function useTimelineData(baseUrl: string) {
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

  const gitService = new GitService(baseUrl, initialConfig.repositories.git, {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    timeout: 15000,
  });

  const specService = new SpecStoryService(baseUrl, initialConfig.repositories.spec, {
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
    sourceToRetry?: 'git' | 'spec'
  ) => {
    logger.info('data', 'Fetching timeline data', { 
      filter,
      sourceToRetry 
    });

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

    try {
      const [gitEvents, specEvents] = await Promise.all([gitPromise, specPromise]);
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

      setState(prev => ({
        ...prev,
        events: filteredEvents,
        period,
      }));

      logger.info('data', 'Timeline data updated', {
        totalEvents: filteredEvents.length,
        period
      });
    } catch (error) {
      logger.error('data', 'Failed to update timeline data', { error });
      
      if (error instanceof TimelineAPIError) {
        throw error;
      }
      throw new Error('Failed to update timeline data');
    }
  }, [filter, gitService, specService, state.events]);

  useEffect(() => {
    fetchTimelineData();
  }, [fetchTimelineData]);

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

  return {
    events: state.events,
    period: state.period,
    isLoading,
    hasError,
    errors,
    sources: state.sources,
    filter,
    updateFilter,
    refresh: fetchTimelineData,
    retry: retrySource,
  };
}

// Local Storage Keys
const FILTER_STORAGE_KEY = 'timeline-filter';

// Hook for persistent filter settings
export function usePersistedTimelineFilter(): [TimelineFilter, (filter: Partial<TimelineFilter>) => void] {
  const [filter, setFilter] = useState<TimelineFilter>(() => {
    const stored = localStorage.getItem(FILTER_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert ISO strings back to Date objects
      if (parsed.startDate) parsed.startDate = new Date(parsed.startDate);
      if (parsed.endDate) parsed.endDate = new Date(parsed.endDate);
      return parsed;
    }
    return { types: ['git', 'spec'] };
  });

  const updateFilter = useCallback((newFilter: Partial<TimelineFilter>) => {
    setFilter(prev => {
      const updated = { ...prev, ...newFilter };
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return [filter, updateFilter];
}