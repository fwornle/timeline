# Redux State Management Guide

## Overview

The Timeline Visualization application uses **Redux Toolkit** for centralized state management, following modern Redux patterns and best practices. This guide covers the complete state management architecture, including store configuration, slices, actions, and integration patterns.

## Store Configuration

### Root Store Setup

```typescript
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';

import timelineSlice from './slices/timelineSlice';
import uiSlice from './slices/uiSlice';
import preferencesSlice from './slices/preferencesSlice';
import repositorySlice from './slices/repositorySlice';

export const store = configureStore({
  reducer: {
    timeline: timelineSlice,
    ui: uiSlice,
    preferences: preferencesSlice,
    repository: repositorySlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disabled for Three.js Vector3 objects
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks for better TypeScript integration
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### Middleware Configuration

The store uses Redux Toolkit's default middleware with customizations:

- **Redux Thunk**: For async actions and side effects
- **Immutability Check**: Ensures state immutability (development only)
- **Serializable Check**: Disabled to allow Three.js objects in state
- **Action Creator Check**: Validates action creators (development only)

## State Slices

### Timeline Slice

Manages all timeline-related state including events, loading states, and data caching.

```typescript
// src/store/slices/timelineSlice.ts
interface TimelineState {
  events: TimelineEvent[];           // Timeline events from git/spec
  loading: boolean;                  // Loading state for data fetching
  error: string | null;             // Error message if any
  gitCount: number;                 // Number of git events
  specCount: number;                // Number of spec events
  currentPosition: number;          // Current timeline position
  markerPosition: number;           // Timeline marker position
  sourceType: 'git' | 'spec' | 'both'; // Data source filter
  isUsingMockData: boolean;         // Whether using mock data
  lastFetchTime: number | null;     // Last data fetch timestamp
  cache: CacheData;                 // Cached timeline data
}

// Key actions
const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
      if (action.payload) state.error = null;
    },
    setEvents: (state, action: PayloadAction<TimelineEvent[]>) => {
      state.events = action.payload;
      state.gitCount = action.payload.filter(e => e.type === 'git').length;
      state.specCount = action.payload.filter(e => e.type === 'spec').length;
      state.loading = false;
      state.lastFetchTime = Date.now();
    },
    setMarkerPosition: (state, action: PayloadAction<number>) => {
      state.markerPosition = action.payload;
    },
    // ... other reducers
  },
});
```

### UI Slice

Controls user interface state including animations, camera, and interaction modes.

```typescript
// src/store/slices/uiSlice.ts
interface UIState {
  // Animation settings
  animationSpeed: number;           // Animation playback speed
  autoDrift: boolean;              // Auto-drift mode enabled
  droneMode: boolean;              // Drone camera mode
  isAutoScrolling: boolean;        // Timeline auto-scrolling

  // View modes
  viewAll: boolean;                // View all timeline events
  focusCurrentMode: boolean;       // Focus on current position
  debugMode: boolean;              // Debug mode enabled

  // Camera state (serializable Vector3 alternative)
  cameraState: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    zoom: number;
  };

  // Card interaction states
  selectedCardId: string | null;   // Currently selected card
  hoveredCardId: string | null;    // Currently hovered card

  // Modal states
  showPreferences: boolean;        // Preferences modal open
  showLoggingControl: boolean;     // Logging control open

  // Layout states
  sidebarOpen: boolean;           // Sidebar visibility
  isInitializing: boolean;        // App initialization state
}
```

### Repository Slice

Manages repository connection, validation, and metadata.

```typescript
// src/store/slices/repositorySlice.ts
interface RepositoryState {
  url: string;                     // Repository URL
  username: string;                // Username for authentication
  isConnected: boolean;            // Connection status
  lastSyncTime: number | null;     // Last successful sync
  connectionError: string | null;  // Connection error message
  isValidating: boolean;           // Validation in progress
  metadata: {                      // Repository metadata
    branch: string;
    lastCommitHash: string;
    lastCommitTime: number | null;
  } | null;
}
```

### Preferences Slice

Handles user preferences with automatic localStorage persistence.

```typescript
// src/store/slices/preferencesSlice.ts
interface PreferencesState extends Preferences {
  isLoaded: boolean;              // Preferences loaded from storage
}

// Auto-saves to localStorage on every update
const preferencesSlice = createSlice({
  name: 'preferences',
  initialState: {
    ...loadPreferences(),         // Load from localStorage
    isLoaded: true,
  },
  reducers: {
    updatePreferences: (state, action: PayloadAction<Partial<Preferences>>) => {
      Object.assign(state, action.payload);
      const { isLoaded: _, ...prefs } = state;
      savePreferences(prefs);     // Auto-save to localStorage
    },
  },
});
```

## Async Actions (Thunks)

### Timeline Data Fetching

```typescript
// src/store/intents/timelineIntents.ts
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
      // Check cache first
      const state = getState();
      const cacheKey = `${repoUrl}-${sourceType}`;
      const cached = state.timeline.cache[cacheKey];
      
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        dispatch(setEvents(cached.data));
        return cached.data;
      }

      // Fetch fresh data
      const events = await fetchTimelineEvents(repoUrl, sourceType);
      
      // Update cache
      dispatch(setCacheData({ key: cacheKey, data: events }));
      dispatch(setEvents(events));
      
      return events;
    } catch (error) {
      dispatch(setError(error.message));
      
      // Fallback to mock data
      if (!useMockData) {
        const mockEvents = await fetchMockData(sourceType);
        dispatch(setEvents(mockEvents));
        dispatch(setIsUsingMockData(true));
        return mockEvents;
      }
      
      throw error;
    }
  }
);
```

### UI State Management

```typescript
// src/store/intents/uiIntents.ts
export const selectCard = createAsyncThunk<
  void,
  { cardId: string | null; position?: Vector3 },
  { state: RootState }
>(
  'ui/selectCard',
  async ({ cardId, position }, { dispatch }) => {
    // Update selected card
    dispatch(setSelectedCardId(cardId));

    // Update camera target if position provided
    if (position) {
      dispatch(updateCameraState({
        target: { x: position.x, y: position.y, z: position.z },
      }));
    }

    // Save camera preferences
    dispatch(updateCameraPreferences());
  }
);

export const updateTimelinePosition = createAsyncThunk<
  void,
  { position: number; updateCamera?: boolean },
  { state: RootState }
>(
  'ui/updateTimelinePosition',
  async ({ position, updateCamera = true }, { dispatch, getState }) => {
    // Update marker position
    dispatch(setMarkerPosition(position));

    // Sync camera if requested
    if (updateCamera) {
      const state = getState();
      const currentCamera = state.ui.cameraState;
      
      dispatch(updateCameraState({
        target: { 
          x: currentCamera.target.x, 
          y: currentCamera.target.y, 
          z: position 
        },
      }));
    }

    // Throttled preference update
    dispatch(updateMarkerPositionPreferences(position));
  }
);
```

## Component Integration

### Connecting Components

```typescript
// Example: TimelineVisualization component
import { useAppDispatch, useAppSelector } from '../store';
import { selectCard, updateTimelinePosition } from '../store/intents/uiIntents';
import { fetchTimelineData } from '../store/intents/timelineIntents';

const TimelineVisualization: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Select state with type safety
  const {
    events,
    loading,
    error,
    markerPosition,
  } = useAppSelector(state => state.timeline);
  
  const {
    selectedCardId,
    cameraState,
    droneMode,
  } = useAppSelector(state => state.ui);
  
  const { url: repoUrl } = useAppSelector(state => state.repository);

  // Memoized event handlers
  const handleCardSelect = useCallback((cardId: string, position: Vector3) => {
    dispatch(selectCard({ cardId, position }));
  }, [dispatch]);

  const handleMarkerMove = useCallback((position: number) => {
    dispatch(updateTimelinePosition({ position }));
  }, [dispatch]);

  // Effect for data fetching
  useEffect(() => {
    if (repoUrl) {
      dispatch(fetchTimelineData({ 
        repoUrl, 
        sourceType: 'both' 
      }));
    }
  }, [dispatch, repoUrl]);

  return (
    <TimelineScene
      events={events}
      selectedCardId={selectedCardId}
      cameraState={cameraState}
      onCardSelect={handleCardSelect}
      onMarkerMove={handleMarkerMove}
      loading={loading}
      error={error}
    />
  );
};
```

### Selector Patterns

```typescript
// Simple selectors
const selectTimelineEvents = (state: RootState) => state.timeline.events;
const selectSelectedCard = (state: RootState) => state.ui.selectedCardId;

// Memoized selectors with reselect
import { createSelector } from '@reduxjs/toolkit';

const selectGitEvents = createSelector(
  [selectTimelineEvents],
  (events) => events.filter(event => event.type === 'git')
);

const selectSpecEvents = createSelector(
  [selectTimelineEvents],
  (events) => events.filter(event => event.type === 'spec')
);

const selectVisibleEvents = createSelector(
  [selectTimelineEvents, (state: RootState) => state.timeline.sourceType],
  (events, sourceType) => {
    if (sourceType === 'both') return events;
    return events.filter(event => event.type === sourceType);
  }
);
```

## State Persistence

### Automatic Persistence

The preferences slice automatically persists to localStorage:

```typescript
// src/services/storage.ts
export function savePreferences(prefs: Preferences) {
  const data = encode(JSON.stringify(prefs));
  localStorage.setItem(STORAGE_KEY, data);
}

export function loadPreferences(): Preferences {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return {};
  try {
    return JSON.parse(decode(data));
  } catch {
    return {};
  }
}
```

### Migration Support

```typescript
// src/store/hooks/usePreferencesMigration.ts
export const usePreferencesMigration = () => {
  const dispatch = useAppDispatch();
  const preferences = useAppSelector(state => state.preferences);

  useEffect(() => {
    // Migrate old localStorage keys to new Redux structure
    const oldPrefs = loadLegacyPreferences();
    if (oldPrefs) {
      dispatch(updatePreferences(migratePreferences(oldPrefs)));
      clearLegacyPreferences();
    }
  }, [dispatch]);

  return { preferences };
};
```

## Performance Optimization

### Selective Re-rendering

```typescript
// Only re-render when specific state changes
const selectedCardId = useAppSelector(state => state.ui.selectedCardId);
const cameraPosition = useAppSelector(state => state.ui.cameraState.position);

// Avoid selecting entire state objects
// ❌ Bad: Will re-render on any UI state change
const uiState = useAppSelector(state => state.ui);

// ✅ Good: Only re-renders when selectedCardId changes
const selectedCardId = useAppSelector(state => state.ui.selectedCardId);
```

### Memoized Callbacks

```typescript
// Memoize event handlers to prevent unnecessary re-renders
const handleCardSelect = useCallback((cardId: string) => {
  dispatch(selectCard({ cardId }));
}, [dispatch]);

const handleSpeedChange = useCallback((speed: number) => {
  dispatch(setAnimationSpeed(speed));
}, [dispatch]);
```

### Batched Updates

Redux Toolkit automatically batches multiple dispatches:

```typescript
// These will be batched into a single re-render
dispatch(setLoading(true));
dispatch(setError(null));
dispatch(setEvents(newEvents));
```

## Debugging

### Redux DevTools

The store is configured with Redux DevTools for debugging:

```typescript
// Automatic DevTools integration in development
export const store = configureStore({
  reducer: { /* ... */ },
  // DevTools automatically enabled in development
});
```

### Action Logging

```typescript
// Custom middleware for action logging
const actionLogger: Middleware = (store) => (next) => (action) => {
  console.log('Dispatching:', action.type, action.payload);
  const result = next(action);
  console.log('New state:', store.getState());
  return result;
};
```

This comprehensive state management system provides a robust foundation for the Timeline Visualization application, ensuring predictable state updates, excellent developer experience, and optimal performance.
