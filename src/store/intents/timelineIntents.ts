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