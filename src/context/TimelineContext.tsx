import React, { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { Timeline, TimelineCreateInput, TimelineUpdateInput } from '../types/timeline';

interface TimelineState {
  timelines: Timeline[];
  loading: boolean;
  error: string | null;
}

type TimelineAction =
  | { type: 'SET_LOADING' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_TIMELINES'; payload: Timeline[] }
  | { type: 'ADD_TIMELINE'; payload: Timeline }
  | { type: 'UPDATE_TIMELINE'; payload: Timeline }
  | { type: 'DELETE_TIMELINE'; payload: string };

const initialState: TimelineState = {
  timelines: [],
  loading: false,
  error: null,
};

const timelineReducer = (state: TimelineState, action: TimelineAction): TimelineState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: true, error: null };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'SET_TIMELINES':
      return { ...state, loading: false, timelines: action.payload, error: null };
    case 'ADD_TIMELINE':
      return {
        ...state,
        loading: false,
        timelines: [...state.timelines, action.payload],
        error: null,
      };
    case 'UPDATE_TIMELINE':
      return {
        ...state,
        loading: false,
        timelines: state.timelines.map((timeline) =>
          timeline.id === action.payload.id ? action.payload : timeline
        ),
        error: null,
      };
    case 'DELETE_TIMELINE':
      return {
        ...state,
        loading: false,
        timelines: state.timelines.filter((timeline) => timeline.id !== action.payload),
        error: null,
      };
    default:
      return state;
  }
};

interface TimelineContextType extends TimelineState {
  createTimeline: (data: TimelineCreateInput) => Promise<Timeline>;
  updateTimeline: (id: string, data: TimelineUpdateInput) => Promise<Timeline>;
  deleteTimeline: (id: string) => Promise<void>;
  getTimeline: (id: string) => Timeline | undefined;
}

const TimelineContext = createContext<TimelineContextType | undefined>(undefined);

export const useTimeline = () => {
  const context = useContext(TimelineContext);
  if (context === undefined) {
    throw new Error('useTimeline must be used within a TimelineProvider');
  }
  return context;
};

interface TimelineProviderProps {
  children: ReactNode;
}

export const TimelineProvider: React.FC<TimelineProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(timelineReducer, initialState);

  const createTimeline = async (data: TimelineCreateInput): Promise<Timeline> => {
    dispatch({ type: 'SET_LOADING' });
    try {
      // TODO: Replace with actual API call
      const newTimeline: Timeline = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dispatch({ type: 'ADD_TIMELINE', payload: newTimeline });
      return newTimeline;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create timeline' });
      throw error;
    }
  };

  const updateTimeline = async (
    id: string,
    data: TimelineUpdateInput
  ): Promise<Timeline> => {
    dispatch({ type: 'SET_LOADING' });
    try {
      // TODO: Replace with actual API call
      const timeline = state.timelines.find((t) => t.id === id);
      if (!timeline) {
        throw new Error('Timeline not found');
      }
      const updatedTimeline: Timeline = {
        ...timeline,
        ...data,
        updatedAt: new Date(),
      };
      dispatch({ type: 'UPDATE_TIMELINE', payload: updatedTimeline });
      return updatedTimeline;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update timeline' });
      throw error;
    }
  };

  const deleteTimeline = async (id: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING' });
    try {
      // TODO: Replace with actual API call
      dispatch({ type: 'DELETE_TIMELINE', payload: id });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete timeline' });
      throw error;
    }
  };

  const getTimeline = (id: string) => {
    return state.timelines.find((timeline) => timeline.id === id);
  };

  return (
    <TimelineContext.Provider
      value={{
        ...state,
        createTimeline,
        updateTimeline,
        deleteTimeline,
        getTimeline,
      }}
    >
      {children}
    </TimelineContext.Provider>
  );
};