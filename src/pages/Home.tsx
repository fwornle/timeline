import React, { useState, useEffect } from 'react';
import { TimelineVisualization } from '../components/TimelineVisualization';
import { useLogger } from '../utils/logging/hooks/useLogger';
import type { CameraState } from '../components/three/TimelineCamera';
import { Vector3 } from 'three';


interface HomeProps {
  onLoadingChange?: (loading: boolean) => void;
  onEventCountsChange?: (gitCount: number, specCount: number) => void;
  onMockStatusChange?: (isGitHistoryMocked: boolean, isSpecHistoryMocked: boolean) => void;
  onPositionChange?: (position: number) => void;
  onCameraPositionChange?: (position: Vector3) => void;
  onCameraStateChange?: (state: CameraState) => void;
  initialCameraState?: CameraState;
  onTimelineDatesChange?: (startDate: Date, endDate: Date) => void;
  onTimelineLengthChange?: (timelineLength: number) => void;
  forceReload?: boolean;
  viewAllMode?: boolean;
  focusCurrentMode?: boolean;
  debugMode?: boolean;
}

const Home: React.FC<HomeProps> = ({
  onLoadingChange,
  onEventCountsChange,
  onMockStatusChange,
  onPositionChange,
  onCameraPositionChange,
  onCameraStateChange,
  initialCameraState,
  onTimelineDatesChange,
  onTimelineLengthChange,
  forceReload = false,
  viewAllMode = false,
  focusCurrentMode = false,
  debugMode = false
}) => {
  const logger = useLogger({ component: 'UI', topic: 'ui' });
  const [error, setError] = useState<Error | null>(null);

  // Debug logging for props received only when in debug mode
  useEffect(() => {
    if (debugMode) {
      logger.debug('Home component received props', {
        hasOnLoadingChange: !!onLoadingChange,
        hasOnEventCountsChange: !!onEventCountsChange,
        hasOnMockStatusChange: !!onMockStatusChange,
        hasOnPositionChange: !!onPositionChange,
        hasOnCameraPositionChange: !!onCameraPositionChange,
        hasOnCameraStateChange: !!onCameraStateChange,
        hasInitialCameraState: !!initialCameraState,
        hasOnTimelineDatesChange: !!onTimelineDatesChange,
        hasOnTimelineLengthChange: !!onTimelineLengthChange,
        forceReload,
        viewAllMode,
        focusCurrentMode
      });
    }
  }, [
    onLoadingChange, onEventCountsChange, onMockStatusChange,
    onPositionChange, onCameraPositionChange, onCameraStateChange,
    initialCameraState, onTimelineDatesChange, onTimelineLengthChange,
    forceReload, viewAllMode, focusCurrentMode, debugMode, logger
  ]);

  // Log error state changes
  useEffect(() => {
    if (error) {
      logger.error('Error state updated', { error: error.message });
    }
  }, [error, logger]);
  const [isLoading, setIsLoading] = useState(false);

  // Get repository URL from preferences (needed for loading check)

  // Handle loading state changes
  const handleLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
    if (onLoadingChange) {
      onLoadingChange(loading);
    }
    logger.info('Loading state changed', { loading });
  };

  // Handle errors
  const handleError = (err: Error | null) => {
    setError(err);
  };

  return (
    <div className="w-100 h-100 position-relative">
      <TimelineVisualization
        onLoadingChange={handleLoadingChange}
        onError={handleError}
        onDataLoaded={(gitEvents, specEvents, isGitHistoryMocked, isSpecHistoryMocked) => {
          if (debugMode) {
            logger.debug('Home.onDataLoaded called', {
              gitEventsCount: gitEvents.length,
              specEventsCount: specEvents.length,
              isGitHistoryMocked,
              isSpecHistoryMocked
            });
          }

          if (onEventCountsChange) {
            onEventCountsChange(gitEvents.length, specEvents.length);
            logger.info('Event counts updated', { gitCount: gitEvents.length, specCount: specEvents.length });
          }

          if (onMockStatusChange) {
            onMockStatusChange(isGitHistoryMocked, isSpecHistoryMocked);
            logger.info('Mock status updated', { isGitHistoryMocked, isSpecHistoryMocked });
          }

          // If there are events with timestamps, determine start and end dates
          if ((gitEvents.length > 0 || specEvents.length > 0)) {
            const allEvents = [...gitEvents, ...specEvents];
            if (allEvents.length > 0) {
              // Validate timestamps first
              const invalidEvents = allEvents.filter(e => !e.timestamp || !(e.timestamp instanceof Date) || isNaN(e.timestamp.getTime()));
              if (invalidEvents.length > 0) {
                logger.error('Found events with invalid timestamps:', { 
                  invalidCount: invalidEvents.length,
                  sampleEvents: invalidEvents.slice(0, 3).map(e => ({ id: e.id, timestamp: e.timestamp }))
                });
                return;
              }
              
              // Sort events by timestamp
              const sortedEvents = [...allEvents].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
              const startDate = sortedEvents[0].timestamp;
              const endDate = sortedEvents[sortedEvents.length - 1].timestamp;

              logger.debug('Setting timeline dates:', { startDate, endDate, eventCount: allEvents.length, hasCallback: !!onTimelineDatesChange });

              if (onTimelineDatesChange) {
                logger.debug('Calling onTimelineDatesChange with:', { startDate, endDate });
                onTimelineDatesChange(startDate, endDate);
              } else {
                logger.error('onTimelineDatesChange callback is not provided!');
              }

              // Calculate and pass timelineLength
              if (onTimelineLengthChange) {
                const minSpacing = 5;
                const timelineLength = Math.max(allEvents.length * minSpacing, 100);
                onTimelineLengthChange(timelineLength);
              }
            }
          }
        }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-4 border-t-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-primary/20" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;