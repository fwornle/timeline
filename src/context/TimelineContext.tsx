import React, { createContext, useContext } from 'react';

interface TimelineContextType {
  purgeAndRefresh?: (hardPurge?: boolean) => Promise<void>;
  hardPurgeAndRefresh?: () => Promise<void>;
}

const TimelineContext = createContext<TimelineContextType>({});

export const useTimelineContext = () => {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error('useTimelineContext must be used within TimelineProvider');
  }
  return context;
};

export const TimelineProvider: React.FC<{
  children: React.ReactNode;
  value: TimelineContextType;
}> = ({ children, value }) => {
  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
};