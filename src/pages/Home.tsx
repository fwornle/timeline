import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../store';
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
  initialMarkerPosition?: number;
  onTimelineDatesChange?: (startDate: Date, endDate: Date) => void;
  onTimelineLengthChange?: (timelineLength: number) => void;
  forceReload?: boolean;
  viewAllMode?: boolean;
  focusCurrentMode?: boolean;
  debugMode?: boolean;
  droneMode?: boolean;
}

const Home: React.FC<HomeProps> = ({
  onLoadingChange,
  onEventCountsChange,
  onMockStatusChange,
  onPositionChange,
  onCameraPositionChange,
  onCameraStateChange,
  initialCameraState,
  initialMarkerPosition = 0,
  onTimelineDatesChange,
  onTimelineLengthChange,
  forceReload = false,
  viewAllMode = false,
  focusCurrentMode = false,
  debugMode = false,
  droneMode = false
}) => {
  const logger = useLogger({ component: 'Home', topic: 'ui' });
  const preferences = useAppSelector(state => state.preferences);
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

  // Get repository URL from preferences
  const repoUrl = preferences.repoUrl || '';
  const animationSpeed = preferences.animationSpeed || 1;
  const autoDrift = preferences.autoDrift || false;

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
    <div className="w-100 h-100 position-absolute top-0 start-0 bottom-0 end-0">
      <TimelineVisualization
        repoUrl={repoUrl}
        animationSpeed={animationSpeed}
        autoDrift={autoDrift}
        droneMode={droneMode}
        onLoadingChange={handleLoadingChange}
        onError={handleError}
        forceReload={forceReload}
        viewAllMode={viewAllMode}
        focusCurrentMode={focusCurrentMode}
        debugMode={debugMode}
        initialCameraState={initialCameraState}
        initialMarkerPosition={initialMarkerPosition}
        onCameraPositionChange={onCameraPositionChange}
        onCameraStateChange={onCameraStateChange}
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
              // Sort events by timestamp
              const sortedEvents = [...allEvents].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
              const startDate = sortedEvents[0].timestamp;
              const endDate = sortedEvents[sortedEvents.length - 1].timestamp;

              if (onTimelineDatesChange) {
                onTimelineDatesChange(startDate, endDate);
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
        onPositionUpdate={(position) => {
          if (debugMode) {
            logger.debug('Home.onPositionUpdate called', { position });
          }
          if (onPositionChange) {
            onPositionChange(position);
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