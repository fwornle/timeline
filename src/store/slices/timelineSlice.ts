import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { TimelineEvent } from '../../data/types/TimelineEvent';
import { loadPreferences } from '../../services/storage';

interface TimelineState {
  events: TimelineEvent[];
  loading: boolean;
  error: string | null;
  gitCount: number;
  specCount: number;
  currentPosition: number;
  markerPosition: number;
  sourceType: 'git' | 'spec' | 'both';
  isUsingMockData: boolean;
  lastFetchTime: number | null;
  thinnedEvents: TimelineEvent[]; // Events that were filtered out by viewport culling
  cache: {
    [key: string]: {
      data: TimelineEvent[];
      timestamp: number;
    };
  };
}

// Load saved preferences to restore marker position
const savedPreferences = loadPreferences();

const initialState: TimelineState = {
  events: [],
  loading: false,
  error: null,
  gitCount: 0,
  specCount: 0,
  currentPosition: savedPreferences.markerPosition || 0,
  markerPosition: savedPreferences.markerPosition || 0,
  sourceType: 'both',
  isUsingMockData: false,
  lastFetchTime: null,
  thinnedEvents: [],
  cache: {},
};

const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    setEvents: (state, action: PayloadAction<TimelineEvent[]>) => {
      state.events = action.payload;
      state.gitCount = action.payload.filter(e => e.type === 'git').length;
      state.specCount = action.payload.filter(e => e.type === 'spec').length;
      state.loading = false;
      state.error = null;
      state.lastFetchTime = Date.now();
    },
    updateCounts: (state, action: PayloadAction<{ gitCount: number; specCount: number }>) => {
      state.gitCount = action.payload.gitCount;
      state.specCount = action.payload.specCount;
    },
    setCurrentPosition: (state, action: PayloadAction<number>) => {
      state.currentPosition = action.payload;
    },
    setMarkerPosition: (state, action: PayloadAction<number>) => {
      state.markerPosition = action.payload;
    },
    setSourceType: (state, action: PayloadAction<'git' | 'spec' | 'both'>) => {
      state.sourceType = action.payload;
    },
    setIsUsingMockData: (state, action: PayloadAction<boolean>) => {
      state.isUsingMockData = action.payload;
    },
    setThinnedEvents: (state, action: PayloadAction<TimelineEvent[]>) => {
      state.thinnedEvents = action.payload;
    },
    setCacheData: (state, action: PayloadAction<{ key: string; data: TimelineEvent[] }>) => {
      state.cache[action.payload.key] = {
        data: action.payload.data,
        timestamp: Date.now(),
      };
    },
    clearCache: (state) => {
      state.cache = {};
    },
    resetTimeline: (state) => {
      state.events = [];
      state.currentPosition = 0;
      state.markerPosition = 0;
      state.error = null;
      state.loading = false;
      state.lastFetchTime = null;
      state.thinnedEvents = [];
    },
  },
});

export const {
  setLoading,
  setError,
  setEvents,
  updateCounts,
  setCurrentPosition,
  setMarkerPosition,
  setSourceType,
  setIsUsingMockData,
  setThinnedEvents,
  setCacheData,
  clearCache,
  resetTimeline,
} = timelineSlice.actions;

export default timelineSlice.reducer;