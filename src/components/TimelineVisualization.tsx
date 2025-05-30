import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import { useLogger } from '../utils/logging/hooks/useLogger';
import { useAppDispatch, useAppSelector } from '../store';
import { useTimelineData } from '../data/hooks/useTimelineData';
import { TimelineScene } from './three/TimelineScene';
import { HorizontalMetricsPlot } from './metrics/HorizontalMetricsPlot';
import type { TimelineEvent } from '../data/types/TimelineEvent';
import { mockGitHistory } from '../data/mocks/mockGitHistory';
import { mockSpecHistory } from '../data/mocks/mockSpecHistory';
import { Vector3 } from 'three';
import {
  setSelectedCardId,
  setHoveredCardId,
  updateCameraState
} from '../store/slices/uiSlice';
import {
  setEvents,
  setLoading,
  setError
} from '../store/slices/timelineSlice';
import { selectCard, hoverCard, updateTimelinePosition } from '../store/intents/uiIntents';
import { calculateTimelineLength } from '../utils/timeline/timelineCalculations';

interface TimelineVisualizationProps {
  // Optional legacy props for compatibility
  onLoadingChange?: (isLoading: boolean) => void;
  onError?: (error: Error | null) => void;
  onDataLoaded?: (
    gitEvents: TimelineEvent[],
    specEvents: TimelineEvent[],
    isGitHistoryMocked: boolean,
    isSpecHistoryMocked: boolean
  ) => void;
}

// Loading component
const LoadingView: React.FC<{
  sources?: {
    git?: { isLoading?: boolean };
    spec?: { isLoading?: boolean };
  };
}> = ({ sources = { git: { isLoading: true }, spec: { isLoading: true } } }) => (
  <div className="h-full flex items-center justify-center bg-light">
    <div className="text-center space-y-4">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      <p className="text-xl font-medium">Loading timeline data...</p>
      <div className="space-y-2 text-sm text-muted">
        {(!sources.git || sources.git.isLoading) && <p>Fetching git history...</p>}
        {(!sources.spec || sources.spec.isLoading) && <p>Fetching spec history...</p>}
      </div>
    </div>
  </div>
);

// Error component - memoized to prevent unnecessary re-renders
const ErrorView: React.FC<{
  onRetryAll: (e: React.MouseEvent) => void;
  onUseMockData?: () => void;
}> = React.memo(({ onRetryAll, onUseMockData }) => (
  <div className="h-full flex items-center justify-center bg-light">
    <div className="text-center space-y-4 max-w-lg px-4">
      <p className="text-danger text-xl">Error loading timeline data</p>

      <div className="bg-danger bg-opacity-10 p-4 rounded-lg mb-2">
        <p className="text-sm mb-3">Network error: Unable to connect to the server</p>

        <div className="d-flex gap-2 justify-content-center">
          <button
            onClick={onRetryAll}
            className="btn btn-danger"
          >
            Retry Connection
          </button>

          {onUseMockData && (
            <button
              onClick={onUseMockData}
              className="btn btn-warning text-dark"
            >
              Use Mocked Data
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted mt-4">
        If the server is offline, you can use mocked data to explore the timeline visualization.
      </p>
    </div>
  </div>
));

// Ref interface for parent components
export interface TimelineVisualizationRef {
  purgeAndRefresh: (hard?: boolean) => Promise<void>;
}

// Main component
export const TimelineVisualization = React.forwardRef<TimelineVisualizationRef, TimelineVisualizationProps>(({
  onLoadingChange,
  onError,
  onDataLoaded,
}, ref) => {
  const dispatch = useAppDispatch();
  const logger = useLogger({ component: 'TimelineVisualization', topic: 'ui' });

  // Get state from Redux store
  const {
    cameraState,
    selectedCardId,
    hoveredCardId,
    viewAll: viewAllMode,
    focusCurrentMode,
    debugMode,
    droneMode,
  } = useAppSelector(state => state.ui);

  const {
    events,
    loading: isLoading,
    error: hasError,
    markerPosition,
  } = useAppSelector(state => state.timeline);

  const {
    url: repoUrl,
  } = useAppSelector(state => state.repository);

  // Use the timeline data hook to fetch data
  const timelineData = useTimelineData(repoUrl);

  // Sync timeline data with Redux state
  useEffect(() => {
    if (timelineData.events.length > 0) {
      dispatch(setEvents(timelineData.events));
      dispatch(setLoading(false));
      dispatch(setError(null));
    } else if (timelineData.hasError) {
      dispatch(setError('Failed to load timeline data'));
      dispatch(setLoading(false));
    } else if (timelineData.isLoading) {
      dispatch(setLoading(true));
      dispatch(setError(null));
    }
  }, [timelineData.events, timelineData.isLoading, timelineData.hasError, dispatch]);

  // Use data from the hook for compatibility flags
  const isGitHistoryMocked = timelineData.isGitHistoryMocked;
  const isSpecHistoryMocked = timelineData.isSpecHistoryMocked;
  const usingMockedData = timelineData.usingMockedData;

  // Legacy error handling
  const sources = timelineData.sources;

  // Track component state
  const showWelcome = !repoUrl;
  const showLoading = isLoading && events.length === 0 && !hasError;
  const showError = hasError && events.length === 0;

  // Track card positions for position updates
  const cardPositionsRef = useRef<Map<string, Vector3>>(new Map());

  // Calculate date range and timeline length for metrics plot
  const { startDate, endDate, timelineLength } = useMemo(() => {
    if (events.length === 0) {
      return { startDate: undefined, endDate: undefined, timelineLength: 100 };
    }

    // Sort events by timestamp
    const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Get the earliest and latest dates
    const startDate = sortedEvents[0].timestamp;
    const endDate = sortedEvents[sortedEvents.length - 1].timestamp;

    // Use centralized timeline length calculation
    const timelineLength = calculateTimelineLength(events.length);

    return { startDate, endDate, timelineLength };
  }, [events]);

  // Simple card animation props function
  const getCardAnimationProps = useCallback((id: string) => {
    const isSelected = selectedCardId === id;
    const isHovered = hoveredCardId === id;

    return {
      scale: isSelected ? 1.2 : isHovered ? 1.1 : 1 as 1 | 1.1 | 1.2,
      rotation: [0, 0, 0] as readonly [0, number, 0],
      positionY: isSelected ? 0.5 : isHovered ? 0.2 : 0 as 0 | 0.5 | 0.2,
      springConfig: { mass: 1, tension: 120, friction: 30 }
    };
  }, [selectedCardId, hoveredCardId]);

  // Card interaction handlers - now dispatch to Redux
  const handleSelectCard = useCallback((id: string | null) => {
    if (id && cardPositionsRef.current.has(id)) {
      const position = cardPositionsRef.current.get(id)!;
      dispatch(selectCard({
        cardId: id,
        position: { x: position.x, y: position.y, z: position.z }
      }));
    } else {
      dispatch(setSelectedCardId(id));
    }
  }, [dispatch]);

  const handleHoverCard = useCallback((id: string | null) => {
    dispatch(setHoveredCardId(id));
    if (id) {
      dispatch(hoverCard(id));
    }
  }, [dispatch]);

  const updateCardPosition = useCallback((id: string, position: Vector3) => {
    cardPositionsRef.current.set(id, position.clone());
  }, []);

  // Store callbacks in refs to avoid dependency issues
  const onLoadingChangeRef = useRef(onLoadingChange);
  const onErrorRef = useRef(onError);
  const onDataLoadedRef = useRef(onDataLoaded);
  const lastEventCountRef = useRef(0);
  const lastEventHashRef = useRef('');

  // Update refs when props change
  useEffect(() => {
    onLoadingChangeRef.current = onLoadingChange;
    onErrorRef.current = onError;
    onDataLoadedRef.current = onDataLoaded;
  }, [onLoadingChange, onError, onDataLoaded]);

  // Update parent loading state
  useEffect(() => {
    if (onLoadingChangeRef.current) {
      onLoadingChangeRef.current(isLoading);
    }
  }, [isLoading]);

  // Update parent error state
  useEffect(() => {
    if (onErrorRef.current) {
      if (hasError) {
        onErrorRef.current(new Error('Timeline data fetch error'));
      } else {
        onErrorRef.current(null);
      }
    }
  }, [hasError]);

  // Listen for reset events
  useEffect(() => {
    const handleReset = () => {
      logger.info('Resetting timeline view');
      // Reset is now handled by Redux
      if (events.length > 0) {
        const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const firstEvent = sortedEvents[0];
        if (cardPositionsRef.current.has(firstEvent.id)) {
          const position = cardPositionsRef.current.get(firstEvent.id)!;
          dispatch(selectCard({ cardId: firstEvent.id, position }));
        }
      } else {
        dispatch(setSelectedCardId(null));
      }
    };

    window.addEventListener('timeline-reset', handleReset);
    return () => {
      window.removeEventListener('timeline-reset', handleReset);
    };
  }, [events, dispatch, logger]);

  // Log significant state changes and notify parent
  useEffect(() => {
    if (debugMode) {
      logger.debug('TimelineVisualization - events changed', {
        eventsCount: events.length,
        gitCount: events.filter(e => e.type === 'git').length,
        specCount: events.filter(e => e.type === 'spec').length
      });
    }

    // Call onDataLoaded callback when we have events
    // Create a hash of event IDs to detect actual changes
    const eventHash = events.map(e => e.id).join(',');
    
    if (onDataLoadedRef.current && events.length > 0 && eventHash !== lastEventHashRef.current) {
      lastEventHashRef.current = eventHash;
      lastEventCountRef.current = events.length;
      const gitEvents = events.filter(e => e.type === 'git');
      const specEvents = events.filter(e => e.type === 'spec');
      onDataLoadedRef.current(gitEvents, specEvents, isGitHistoryMocked, isSpecHistoryMocked);
    }
  }, [events, isGitHistoryMocked, isSpecHistoryMocked, debugMode, logger]);

  // Event handlers
  const handleRefresh = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    logger.info('Refresh requested');
    timelineData.refresh();
  }, [logger, timelineData]);

  const handleUseMockData = useCallback(() => {
    // Load mock data and clear error state
    const mockGitEvents = mockGitHistory();
    const mockSpecEvents = mockSpecHistory();
    const allMockEvents = [...mockGitEvents, ...mockSpecEvents];

    // Update Redux state
    dispatch(setEvents(allMockEvents));
    dispatch(setError(null));
    dispatch(setLoading(false));

    // Update parent component if callback exists
    if (onDataLoadedRef.current) {
      onDataLoadedRef.current(mockGitEvents, mockSpecEvents, true, true);
    }

    logger.info('Using mock data', {
      gitCount: mockGitEvents.length,
      specCount: mockSpecEvents.length
    });
  }, [dispatch, logger]);

  // Expose methods to parent via ref
  React.useImperativeHandle(ref, () => ({
    purgeAndRefresh: async (hard = false) => {
      logger.info('Purge and refresh requested', { hard });
      if (hard) {
        await timelineData.hardPurgeAndRefresh();
      } else {
        await timelineData.purgeAndRefresh();
      }
    }
  }), [timelineData, logger]);
  
  // Listen for global reload events
  useEffect(() => {
    const handleReloadEvent = (event: CustomEvent) => {
      logger.info('Received reload event', event.detail);
      if (event.detail.hard) {
        timelineData.hardPurgeAndRefresh();
      } else {
        timelineData.purgeAndRefresh();
      }
    };
    
    window.addEventListener('timeline-reload' as any, handleReloadEvent);
    return () => {
      window.removeEventListener('timeline-reload' as any, handleReloadEvent);
    };
  }, [timelineData, logger]);

  // Render the appropriate view
  if (showWelcome) {
    return (
      <div className="h-full flex items-center justify-center bg-light">
        <div className="text-center max-w-md px-6 py-8 bg-white rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Welcome to Timeline</h2>
          <p className="mb-6">
            Please enter a Git repository URL in the settings to visualize its history.
          </p>
          <div className="bg-light p-4 rounded-lg text-left text-sm">
            <p className="mb-3 font-medium">Supported formats:</p>
            <ul className="space-y-2">
              <li>
                <span>HTTPS: </span>
                <code className="px-1.5 py-0.5 bg-light rounded">https://github.com/username/repo.git</code>
              </li>
              <li>
                <span>SSH: </span>
                <code className="px-1.5 py-0.5 bg-light rounded">git@github.com:username/repo.git</code>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (showLoading) {
    return <LoadingView sources={sources} />;
  }

  if (showError) {
    return (
      <ErrorView
        onRetryAll={handleRefresh}
        onUseMockData={handleUseMockData}
      />
    );
  }

  // Show timeline view with optional loading overlay
  const isPartialLoading = isLoading && events.length > 0;

  // Use a single status overlay for both loading and error states
  const showStatusOverlay = (isPartialLoading || (hasError && events.length > 0));

  return (
    <div className="position-relative w-100 h-100" style={{ height: '100vh' }}>
      {/* 3D Timeline Scene - Full Height */}
      <div className="w-100 h-100">
        <TimelineScene
          events={events}
          selectedCardId={selectedCardId}
          cameraTarget={new Vector3(0, 0, markerPosition || 0)}
          onCardSelect={handleSelectCard}
          onCardHover={handleHoverCard}
          onCardPositionUpdate={updateCardPosition}
          getCardAnimationProps={getCardAnimationProps}
          viewAllMode={viewAllMode}
          focusCurrentMode={focusCurrentMode}
          droneMode={droneMode}
          currentPosition={markerPosition || 0}
          onMarkerPositionChange={(position) => {
            dispatch(updateTimelinePosition({ position }));
          }}
          onCameraPositionChange={() => {
            // Camera position changes are handled by Redux through TimelineCamera
          }}
          onCameraStateChange={(state) => {
            if (debugMode) {
              logger.debug('[TimelineVisualization] Camera state from TimelineScene:', {
                position: {
                  x: state.position.x.toFixed(2),
                  y: state.position.y.toFixed(2),
                  z: state.position.z.toFixed(2)
                },
                target: {
                  x: state.target.x.toFixed(2),
                  y: state.target.y.toFixed(2),
                  z: state.target.z.toFixed(2)
                },
                zoom: state.zoom.toFixed(2)
              });
            }

            // Update Redux state - convert Vector3 to plain objects
            dispatch(updateCameraState({
              position: { x: state.position.x, y: state.position.y, z: state.position.z },
              target: { x: state.target.x, y: state.target.y, z: state.target.z },
              zoom: state.zoom
            }));
            
          }}
          initialCameraState={{
            position: new Vector3(cameraState.position.x, cameraState.position.y, cameraState.position.z),
            target: new Vector3(cameraState.target.x, cameraState.target.y, cameraState.target.z),
            zoom: cameraState.zoom,
          }}
          debugMode={debugMode}
        />
      </div>

      {/* Horizontal Metrics Plot - Overlay */}
      {events.length > 0 && (
        <HorizontalMetricsPlot
          events={events}
          currentPosition={markerPosition || 0}
          timelineLength={timelineLength}
          startDate={startDate}
          endDate={endDate}
          onPositionChange={(position) => {
            dispatch(updateTimelinePosition({ position }));
          }}
          height={120}
          className="position-absolute top-0 start-0 w-100"
        />
      )}

      {/* Single status overlay for both loading and error states */}
      {showStatusOverlay && (
        <div
          className="position-absolute bottom-4 end-4 rounded p-3"
          style={{
            zIndex: 10,
            maxWidth: '400px',
            backgroundColor: hasError ? 'rgba(220, 53, 69, 0.8)' : 'rgba(33, 37, 41, 0.8)',
            transition: 'background-color 0.3s ease'
          }}
        >
          <div className="d-flex flex-column gap-2">
            {/* Status header */}
            <div className="d-flex align-items-center justify-content-between">
              {isPartialLoading && !hasError && (
                <>
                  <div className="d-flex align-items-center">
                    <div className="spinner-border spinner-border-sm text-light me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-white fw-medium mb-0">Updating timeline data...</p>
                  </div>
                </>
              )}

              {hasError && (
                <>
                  <p className="text-white fw-medium mb-0">Connection Error</p>
                  <button
                    onClick={handleRefresh}
                    className="btn btn-sm btn-outline-light"
                  >
                    Retry All
                  </button>
                </>
              )}
            </div>

            {/* Loading details */}
            {isPartialLoading && !hasError && (
              <div className="text-sm text-white">
                {(!sources.git || sources.git.isLoading) && <p className="mb-1">Fetching git history...</p>}
                {(!sources.spec || sources.spec.isLoading) && <p className="mb-0">Fetching spec history...</p>}
              </div>
            )}

            {/* Error details */}
            {hasError && (
              <div className="text-sm text-white">
                <p className="mb-2">Network error: Unable to connect to the server</p>
                <div className="d-flex gap-2">
                  <button
                    onClick={handleRefresh}
                    className="btn btn-sm btn-outline-light"
                  >
                    Retry
                  </button>
                  <button
                    onClick={handleUseMockData}
                    className="btn btn-sm btn-warning text-dark"
                  >
                    Use Mocked Data
                  </button>
                </div>
              </div>
            )}

            {/* Mocked data indicator */}
            {usingMockedData && !hasError && (
              <div className="text-sm text-white">
                <p className="mb-2">
                  <i className="bi bi-database me-1"></i>
                  Using mocked data
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});