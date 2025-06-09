import { configureStore, Middleware, Action } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';

import timelineSlice from './slices/timelineSlice';
import uiSlice from './slices/uiSlice';
import preferencesSlice from './slices/preferencesSlice';
import repositorySlice from './slices/repositorySlice';
import { Logger } from '../utils/logging/Logger';

interface PayloadAction extends Action {
  payload?: unknown;
}

interface StoreState {
  ui?: {
    hoveredCardId?: string | null;
  };
}

// Custom logging middleware for debugging hover issues
const hoverLoggingMiddleware: Middleware = store => next => (action: PayloadAction) => {
  // Log hover-related actions
  if (action.type === 'ui/setHoveredCardId' || 
      action.type === 'ui/hoverCard/pending' ||
      action.type === 'ui/hoverCard/fulfilled') {
    try {
      const state = store.getState() as StoreState;
      
      // Safe payload extraction
      let payloadValue = 'null';
      if (action.payload !== null && action.payload !== undefined) {
        if (typeof action.payload === 'string' && action.payload.slice) {
          payloadValue = action.payload.slice(-6);
        } else {
          payloadValue = String(action.payload);
        }
      }
      
      Logger.debug('REDUX', 'middleware', 'Hover action dispatched', {
        type: action.type,
        payload: payloadValue,
        currentHoveredCardId: state.ui?.hoveredCardId ? state.ui.hoveredCardId.slice(-6) : 'null',
        timestamp: Date.now()
      });
    } catch {
      // Silently fail if logging doesn't work
    }
  }
  
  return next(action);
};

export const store = configureStore({
  reducer: {
    timeline: timelineSlice,
    ui: uiSlice,
    preferences: preferencesSlice,
    repository: repositorySlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Disable serialization checks in development for now
      // TODO: Properly serialize Date objects and Vector3 objects in production
      serializableCheck: false,
    }).concat(hoverLoggingMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;