import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { TimelineEvent } from '../../data/types/TimelineEvent';
import { 
  setLoading, 
  setError, 
  setEvents, 
  setCacheData, 
  setIsUsingMockData,
  updateCounts 
} from '../slices/timelineSlice';
import { setIsReloadingSoft, setIsReloadingHard } from '../slices/uiSlice';

// Intent to fetch timeline data
export const fetchTimelineData = createAsyncThunk<
  TimelineEvent[],
  { repoUrl: string; sourceType: 'git' | 'spec' | 'both'; useMockData?: boolean },
  { state: RootState }
>(
  'timeline/fetchData',
  async ({ repoUrl, sourceType, useMockData = false }, { dispatch, getState }) => {
    dispatch(setLoading(true));
    dispatch(setIsUsingMockData(useMockData));

    try {
      if (useMockData) {
        // Import mock data dynamically
        const { mockGitHistory } = await import('../../data/mocks/mockGitHistory');
        const { mockSpecHistory } = await import('../../data/mocks/mockSpecHistory');
        
        let events: TimelineEvent[] = [];
        
        if (sourceType === 'git' || sourceType === 'both') {
          events = [...events, ...mockGitHistory()];
        }
        
        if (sourceType === 'spec' || sourceType === 'both') {
          events = [...events, ...mockSpecHistory()];
        }
        
        // Sort by timestamp
        events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        dispatch(setEvents(events));
        return events;
      }

      // Check cache first
      const state = getState();
      const cacheKey = `${repoUrl}-${sourceType}`;
      const cached = state.timeline.cache[cacheKey];
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
      
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        dispatch(setEvents(cached.data));
        return cached.data;
      }

      // Fetch from API
      const response = await fetch(`/api/timeline?repo=${encodeURIComponent(repoUrl)}&type=${sourceType}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch timeline data: ${response.statusText}`);
      }
      
      const data = await response.json();
      const events: TimelineEvent[] = data.events.map((event: TimelineEvent) => ({
        ...event,
        timestamp: new Date(event.timestamp),
      }));
      
      // Cache the results
      dispatch(setCacheData({ key: cacheKey, data: events }));
      dispatch(setEvents(events));
      
      return events;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      dispatch(setError(message));
      throw error;
    }
  }
);

// Intent to refresh timeline counts
export const refreshTimelineCounts = createAsyncThunk<
  { gitCount: number; specCount: number },
  { repoUrl: string },
  { state: RootState }
>(
  'timeline/refreshCounts',
  async ({ repoUrl }, { dispatch }) => {
    try {
      const response = await fetch(`/api/timeline/counts?repo=${encodeURIComponent(repoUrl)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch counts: ${response.statusText}`);
      }
      
      const data = await response.json();
      dispatch(updateCounts(data));
      
      return data;
    } catch (error) {
      console.error('Failed to refresh counts:', error);
      return { gitCount: 0, specCount: 0 };
    }
  }
);

// Intent to reset timeline with event dispatch
export const resetTimelineWithEvent = createAsyncThunk<void, void, { state: RootState }>(
  'timeline/resetWithEvent',
  async () => {
    // Dispatch custom event for components that need to know
    window.dispatchEvent(new CustomEvent('timeline-reset'));
    
    // Reset store state is handled by the reducer
  }
);

// Intent to purge cache and reload timeline data
export const purgeAndReloadTimeline = createAsyncThunk<
  void,
  { repoUrl: string; hard?: boolean },
  { state: RootState }
>(
  'timeline/purgeAndReload',
  async ({ repoUrl, hard = false }, { dispatch }) => {
    if (!repoUrl) {
      return;
    }

    // Set loading and reload state
    dispatch(setLoading(true));
    dispatch(setError(null));
    dispatch(hard ? setIsReloadingHard(true) : setIsReloadingSoft(true));

    try {
      // Purge the cache on the server
      const purgeEndpoint = hard ? '/purge/hard' : '/purge';
      const purgeResponse = await fetch(
        `http://localhost:3030/api/v1${purgeEndpoint}?repository=${encodeURIComponent(repoUrl)}`,
        { method: 'POST' }
      );

      if (!purgeResponse.ok) {
        throw new Error(`Failed to purge cache: ${purgeResponse.statusText}`);
      }

      // Wait a bit to ensure cache is cleared
      await new Promise(resolve => setTimeout(resolve, hard ? 1000 : 500));

      // Clear the Redux store state to force a fresh fetch
      dispatch(setEvents([]));
      dispatch(setCacheData({ key: `${repoUrl}-git`, data: [] }));
      dispatch(setCacheData({ key: `${repoUrl}-spec`, data: [] }));
      dispatch(setCacheData({ key: `${repoUrl}-both`, data: [] }));

      // Dispatch the timeline-reload event to trigger useTimelineData hook
      const event = new CustomEvent('timeline-reload', { detail: { hard } });
      window.dispatchEvent(event);

      // Wait for the data to be loaded by monitoring state changes
      // The useTimelineData hook will handle fetching new data
      // We'll listen for the loading state to be cleared
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to purge and reload';
      dispatch(setError(message));
      console.error('Purge and reload failed:', error);
      
      // Only clear reload states on error
      dispatch(setIsReloadingSoft(false));
      dispatch(setIsReloadingHard(false));
    }
  }
);