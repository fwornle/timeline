import { useState, useEffect, useCallback } from 'react';
import type { TimelineEvent, TimelinePeriod } from '../types/TimelineEvent';
import { GitService } from '../services/GitService';
import { SpecStoryService } from '../services/SpecStoryService';
import { Logger } from '../../utils/logging/Logger';

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
  const [isGitHistoryMocked, setIsGitHistoryMocked] = useState(false);
  const [isSpecHistoryMocked, setIsSpecHistoryMocked] = useState(false);
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

      // Update separate mock flags for each data source
      setIsGitHistoryMocked(gitResult.mocked);
      setIsSpecHistoryMocked(specResult.mocked);
      Logger.debug(Logger.Categories.DATA, 'useTimelineData fetchTimelineData', {
        gitMocked: gitResult.mocked,
        specMocked: specResult.mocked
      });

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
      Logger.error(Logger.Categories.DATA, 'Failed to fetch timeline data', { error });
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

    Logger.info(Logger.Categories.DATA, 'Initial fetch for repository', { repoUrl });

    // Start the fetch process
    const doFetch = async () => {
      setIsFetching(true);
      try {
        const [gitResult, specResult] = await Promise.all([
          gitService().fetchGitHistory(),
          specService().fetchSpecHistory()
        ]);

        setIsGitHistoryMocked(gitResult.mocked);
        setIsSpecHistoryMocked(specResult.mocked);
        Logger.debug(Logger.Categories.DATA, 'useTimelineData initial fetch', {
          gitMocked: gitResult.mocked,
          specMocked: specResult.mocked
        });

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
        Logger.error(Logger.Categories.DATA, 'Failed to fetch timeline data', { error });
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

  // Helper function to fetch data (no retries)
  const fetchData = useCallback(async (type: 'git' | 'spec') => {
    try {
      // Set a timeout for the entire operation
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Fetch ${type} data timed out after 60 seconds`));
        }, 60000); // 60 second timeout
      });

      // Race the fetch operation against the timeout
      return await Promise.race([
        type === 'git' ? gitService().fetchGitHistory() : specService().fetchSpecHistory(),
        timeoutPromise
      ]);
    } catch (error) {
      Logger.error(Logger.Categories.DATA, 'Failed to fetch ${type} data', { error });

      // Create a mock result with empty data and mocked flag
      const mockResult = {
        events: [],
        mocked: true
      };

      // Return mock data on error to prevent UI from hanging
      return mockResult;
    }
  }, [gitService, specService]);

  // Function to purge cache and reload data
  const purgeAndRefresh = useCallback(async (hardPurge = false) => {
    if (!repoUrl) {
      return;
    }

    // If already fetching, don't start another fetch
    if (isFetching) {
      Logger.warn(Logger.Categories.DATA, 'Ignoring purgeAndRefresh request - already fetching data');
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
      if (hardPurge) {
        // Hard purge - purge everything at once
        const response = await fetch(`${API_BASE_URL}/purge/hard?repository=${encodeURIComponent(repoUrl)}`, {
          method: 'POST'
        });

        if (!response.ok) {
          throw new Error('Failed to purge cache');
        }

        // Wait a bit to ensure the cache is cleared
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Fetch fresh data
        const [gitResult, specResult] = await Promise.all([
          fetchData('git'),
          fetchData('spec')
        ]);

        setIsGitHistoryMocked(gitResult.mocked);
        setIsSpecHistoryMocked(specResult.mocked);

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
      } else {
        // Soft purge - purge and reload each data source separately

        // First purge and reload git data
        setState(prev => ({
          ...prev,
          sources: {
            ...prev.sources,
            git: { isLoading: true, error: null }
          }
        }));

        try {
          // Purge git cache
          const gitPurgeResponse = await fetch(`${API_BASE_URL}/purge/git?repository=${encodeURIComponent(repoUrl)}`, {
            method: 'POST'
          });

          if (!gitPurgeResponse.ok) {
            throw new Error('Failed to purge git cache');
          }

          // Wait a bit to ensure the cache is cleared
          await new Promise(resolve => setTimeout(resolve, 500));

          // Fetch fresh git data
          const gitResult = await fetchData('git');
          setIsGitHistoryMocked(gitResult.mocked);

          // Update git data in state
          setState(prev => {
            const gitEvents = gitResult.events;
            const specEvents = prev.events.filter(e => e.type === 'spec');
            const allEvents = [...gitEvents, ...specEvents]
              .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

            const period = allEvents.length > 0 ? {
              start: allEvents[0].timestamp,
              end: allEvents[allEvents.length - 1].timestamp,
              events: allEvents
            } : null;

            return {
              events: allEvents,
              period,
              sources: {
                ...prev.sources,
                git: { isLoading: false, error: null }
              }
            };
          });
        } catch (error) {
          Logger.error(Logger.Categories.DATA, 'Failed to purge and refresh git data', { error });
          setState(prev => ({
            ...prev,
            sources: {
              ...prev.sources,
              git: { isLoading: false, error: error as Error }
            }
          }));
        }

        // Then purge and reload spec data
        setState(prev => ({
          ...prev,
          sources: {
            ...prev.sources,
            spec: { isLoading: true, error: null }
          }
        }));

        try {
          // Purge spec cache
          const specPurgeResponse = await fetch(`${API_BASE_URL}/purge/spec?repository=${encodeURIComponent(repoUrl)}`, {
            method: 'POST'
          });

          if (!specPurgeResponse.ok) {
            throw new Error('Failed to purge spec cache');
          }

          // Wait a bit to ensure the cache is cleared
          await new Promise(resolve => setTimeout(resolve, 500));

          // Fetch fresh spec data
          const specResult = await fetchData('spec');
          setIsSpecHistoryMocked(specResult.mocked);

          // Update spec data in state
          setState(prev => {
            const gitEvents = prev.events.filter(e => e.type === 'git');
            const specEvents = specResult.events;
            const allEvents = [...gitEvents, ...specEvents]
              .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

            const period = allEvents.length > 0 ? {
              start: allEvents[0].timestamp,
              end: allEvents[allEvents.length - 1].timestamp,
              events: allEvents
            } : null;

            return {
              events: allEvents,
              period,
              sources: {
                ...prev.sources,
                spec: { isLoading: false, error: null }
              }
            };
          });
        } catch (error) {
          Logger.error(Logger.Categories.DATA, 'Failed to purge and refresh spec data', { error });
          setState(prev => ({
            ...prev,
            sources: {
              ...prev.sources,
              spec: { isLoading: false, error: error as Error }
            }
          }));
        }
      }
    } catch (error) {
      Logger.error(Logger.Categories.DATA, `Failed to ${hardPurge ? 'hard ' : ''}purge and refresh data`, { error });
      setState(prev => ({
        ...prev,
        sources: {
          git: { isLoading: false, error: error as Error },
          spec: { isLoading: false, error: error as Error }
        }
      }));
    } finally {
      // Always reset the fetching state to prevent UI from being stuck
      setIsFetching(false);

      // Set hasInitialFetch to true to prevent automatic refetching
      setHasInitialFetch(true);
    }
  }, [repoUrl, isFetching, fetchData]);

  // Convenience method for hard reload
  const hardPurgeAndRefresh = useCallback(() => {
    return purgeAndRefresh(true);
  }, [purgeAndRefresh]);

  const updateFilter = useCallback((newFilter: Partial<TimelineFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  // Hard reload is now just a wrapper around purgeAndRefresh with hardPurge=true
  const hardReload = useCallback(async () => {
    if (!repoUrl) return;
    await purgeAndRefresh(true);
  }, [repoUrl, purgeAndRefresh]);

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
    isGitHistoryMocked,
    isSpecHistoryMocked,
    usingMockedData: isGitHistoryMocked || isSpecHistoryMocked,
    hardReload
  };
}
