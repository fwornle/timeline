import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLogger } from '../utils/logging/hooks/useLogger';
import { useTimelineData } from '../data/hooks/useTimelineData';
import { useTimelineAnimation } from '../animation/useTimelineAnimation';
import { TimelineScene } from './three/TimelineScene';
import type { TimelineEvent } from '../data/types/TimelineEvent';
import { mockGitHistory } from '../data/mocks/mockGitHistory';
import { mockSpecHistory } from '../data/mocks/mockSpecHistory';
import { Vector3 } from 'three';
import type { CameraState } from './three/TimelineCamera';


interface TimelineVisualizationProps {
  repoUrl: string;
  animationSpeed: number;
  autoDrift: boolean;
  onLoadingChange: (isLoading: boolean) => void;
  onError: (error: Error | null) => void;
  onDataLoaded?: (
    gitEvents: TimelineEvent[],
    specEvents: TimelineEvent[],
    isGitHistoryMocked: boolean,
    isSpecHistoryMocked: boolean
  ) => void;
  onPositionUpdate?: (position: number) => void;
  onCameraPositionChange?: (position: Vector3) => void;
  onCameraStateChange?: (state: CameraState) => void;
  initialCameraState?: CameraState;
  initialMarkerPosition?: number;
  forceReload?: boolean;
  viewAllMode?: boolean;
  focusCurrentMode?: boolean;
  debugMode?: boolean;
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

// Main component
export const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({
  repoUrl,
  animationSpeed,
  autoDrift,
  onLoadingChange,
  onError,
  onDataLoaded,
  onPositionUpdate,
  onCameraPositionChange,
  onCameraStateChange,
  initialCameraState,
  initialMarkerPosition = 0,
  forceReload = false,
  viewAllMode: externalViewAllMode = false,
  focusCurrentMode: externalFocusCurrentMode = false,
  debugMode = false,
}) => {
  // Always initialize hooks regardless of repoUrl to maintain hook order
  const logger = useLogger({ component: 'TimelineVisualization', topic: 'ui' });

  // Log received props for camera state callbacks
  useEffect(() => {
    logger.debug('TimelineVisualization received camera props:', {
      hasOnCameraPositionChange: !!onCameraPositionChange,
      hasOnCameraStateChange: !!onCameraStateChange,
      hasInitialCameraState: !!initialCameraState,
      debugMode
    });
  }, [onCameraPositionChange, onCameraStateChange, initialCameraState, debugMode]);

  // Component state
  const [showWelcome, setShowWelcome] = useState(!repoUrl);
  const [showLoading, setShowLoading] = useState(false);
  const [showError, setShowError] = useState(false);

  // Timeline data
  const {
    events,
    isLoading,
    hasError,
    errors,
    sources,
    period,
    refresh,
    purgeAndRefresh,
    isGitHistoryMocked,
    isSpecHistoryMocked,
    usingMockedData,
  } = useTimelineData(repoUrl);

  // Track the previous forceReload value to detect changes
  const prevForceReloadRef = useRef<boolean | undefined>(undefined);

  // Handle force reload when the prop changes
  useEffect(() => {
    // Only trigger reload if forceReload changed from false to true
    if (forceReload && prevForceReloadRef.current !== forceReload && repoUrl && !isLoading) {
      logger.info('Forcing data reload with cache purge', { repoUrl });

      // Use purgeAndRefresh to clear the cache first, then reload
      // Wrap in a try/catch to ensure we don't get stuck in a loading state
      try {
        purgeAndRefresh();
      } catch (error) {
        logger.error('Error during forced reload', { error });
        // The purgeAndRefresh function should handle its own errors and reset loading state
      }
    }

    // Update the ref with current value for next comparison
    prevForceReloadRef.current = forceReload;
  }, [forceReload, repoUrl, purgeAndRefresh, logger, isLoading]);

  // Track external view mode changes
  useEffect(() => {
    if (externalViewAllMode) {
      logger.info('External view all mode activated');
    }
    if (externalFocusCurrentMode) {
      logger.info('External focus mode activated');
    }
  }, [externalViewAllMode, externalFocusCurrentMode, logger]);

  // Use external props directly - we don't need internal state anymore
  const viewAllMode = externalViewAllMode;
  const focusCurrentMode = externalFocusCurrentMode;

  // Animation state
  const {
    isAutoScrolling,
    selectedCardId,
    cameraTarget,
    cardPositionsRef,
    getCardAnimationProps,
    updateCardPosition,
    selectCard,
    setHoveredCard,
    toggleAutoScroll,
    setScrollSpeed,
    setCameraTargetZ,
  } = useTimelineAnimation({
    enableAutoScroll: autoDrift,
    initialScrollSpeed: animationSpeed,
    initialMarkerPosition: initialMarkerPosition,
  });

  // Determine which view to show based on state - with stable error handling
  useEffect(() => {
    // Welcome screen logic remains the same
    setShowWelcome(!repoUrl);

    // If we have events, we should show the timeline regardless of error state
    if (!!repoUrl && events.length > 0) {
      setShowLoading(false);
      setShowError(false);
    }
    // Only show loading on initial load, not during error states
    else if (!!repoUrl && isLoading && events.length === 0 && !hasError) {
      setShowLoading(true);
      setShowError(false);
    }
    // Show error screen only if we have no events AND there's an error
    else if (!!repoUrl && !!hasError && events.length === 0) {
      setShowLoading(false);
      setShowError(true);
    }
    // Normal state - no error, no loading
    else if (!isLoading) {
      setShowLoading(false);
      setShowError(false);
    }
  }, [repoUrl, isLoading, hasError, events.length]);

  // Update parent loading state
  useEffect(() => {
    onLoadingChange(isLoading);
  }, [isLoading, onLoadingChange]);

  // Update parent error state
  useEffect(() => {
    if (hasError) {
      const errorMessage = errors.git?.message || errors.spec?.message || 'Unknown error';
      onError(new Error(errorMessage));
    } else {
      onError(null);
    }
  }, [hasError, errors, onError]);

  // Update animation speed when prop changes
  useEffect(() => {
    setScrollSpeed(animationSpeed);
  }, [animationSpeed, setScrollSpeed]);

  // Update auto-drift when prop changes
  useEffect(() => {
    if (autoDrift !== isAutoScrolling) {
      toggleAutoScroll();
    }
  }, [autoDrift, isAutoScrolling, toggleAutoScroll]);

  // Listen for reset events
  useEffect(() => {
    const handleReset = () => {
      logger.info('Resetting timeline view');

      // Reset camera to the beginning of the timeline (-length/2)
      if (events.length > 0) {
        // Sort events by timestamp to find the earliest
        const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const firstEvent = sortedEvents[0];

        // Select the first event (which should be at -length/2)
        if (cardPositionsRef.current.has(firstEvent.id)) {
          selectCard(firstEvent.id);
        }
      } else {
        // If no events, reset to origin
        selectCard(null);
      }

      // Ensure auto-scrolling is stopped
      if (isAutoScrolling) {
        toggleAutoScroll();
      }
    };

    window.addEventListener('timeline-reset', handleReset);
    return () => {
      window.removeEventListener('timeline-reset', handleReset);
    };
  }, [events, cardPositionsRef, selectCard, toggleAutoScroll, isAutoScrolling, logger]);

  // Throttle position updates to prevent excessive re-renders
  const lastPositionUpdateRef = useRef<number>(0);
  const lastReportedPositionRef = useRef<number>(0);
  const positionUpdateThrottleMs = 16; // ~60fps

  // Update position for parent component - but only when it's a significant change
  // and not during auto-scrolling to prevent circular updates
  useEffect(() => {
    if (onPositionUpdate && cameraTarget && !isAutoScrolling) {
      const now = Date.now();
      const newPosition = cameraTarget.z;
      const positionDelta = Math.abs(newPosition - lastReportedPositionRef.current);

      // Only report position changes if enough time has passed AND position changed significantly
      if (now - lastPositionUpdateRef.current >= positionUpdateThrottleMs && positionDelta > 0.1) {
        onPositionUpdate(newPosition);
        lastPositionUpdateRef.current = now;
        lastReportedPositionRef.current = newPosition;
      }
    }
  }, [cameraTarget, onPositionUpdate, isAutoScrolling]);

  // Also update position when a card is selected
  useEffect(() => {
    if (onPositionUpdate && selectedCardId) {
      // Access the card positions from the animation hook
      if (cardPositionsRef && cardPositionsRef.current && cardPositionsRef.current.has(selectedCardId)) {
        const position = cardPositionsRef.current.get(selectedCardId)!;
        onPositionUpdate(position.z);
        if (debugMode) {
          logger.debug('Position updated from card selection', { position: position.z });
        }
      }
    }
  }, [selectedCardId, onPositionUpdate, cardPositionsRef, debugMode, logger]);

  // Log significant state changes and notify parent
  useEffect(() => {
    if (debugMode) {
      logger.debug('TimelineVisualization - events or period changed', {
        eventsCount: events.length,
        gitCount: events.filter(e => e.type === 'git').length,
        specCount: events.filter(e => e.type === 'spec').length
      });
    }

    // Call onDataLoaded callback when we have events
    if (onDataLoaded && events.length > 0) {
      const gitEvents = events.filter(e => e.type === 'git');
      const specEvents = events.filter(e => e.type === 'spec');
      onDataLoaded(gitEvents, specEvents, isGitHistoryMocked, isSpecHistoryMocked);
    }
  }, [events, period, onDataLoaded, isGitHistoryMocked, isSpecHistoryMocked, debugMode, logger]);

  // Event handlers
  const handleRefresh = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    refresh();
  }, [refresh]);

  // Camera control handlers - these are now handled by the parent component
  // but we keep them for reference and potential future use

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
        onUseMockData={() => {
          // Load mock data and clear error state
          const mockGitEvents = mockGitHistory();
          const mockSpecEvents = mockSpecHistory();

          // Clear error state to show the timeline
          setShowError(false);

          // Update local state with mock data
          const allMockEvents = [...mockGitEvents, ...mockSpecEvents];
          allMockEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

          // Update the parent component with mock data
          if (onDataLoaded) {
            onDataLoaded(mockGitEvents, mockSpecEvents, true, true);
          }

          // If there's an onError handler, clear the error
          if (onError) {
            onError(null);
          }

          // Log that we're using mock data
          logger.info('Using mock data after error', {
            gitCount: mockGitEvents.length,
            specCount: mockSpecEvents.length
          });

          // Force a refresh with mock data
          refresh();
        }}
      />
    );
  }

  // Show timeline view with optional loading overlay
  const isPartialLoading = isLoading && events.length > 0;

  // Use a single status overlay for both loading and error states
  const showStatusOverlay = (isPartialLoading || (hasError && events.length > 0));

  return (
    <div className="position-relative w-100 h-100" style={{ height: '100vh' }}>
      <div className="w-100 h-100">
        <TimelineScene
          events={events}
          selectedCardId={selectedCardId}
          cameraTarget={cameraTarget}
          onCardSelect={selectCard}
          onCardHover={setHoveredCard}
          onCardPositionUpdate={updateCardPosition}
          getCardAnimationProps={getCardAnimationProps}
          viewAllMode={viewAllMode}
          focusCurrentMode={focusCurrentMode}
          droneMode={isAutoScrolling}
          currentPosition={cameraTarget.z}
          onMarkerPositionChange={(position) => {
            // Update camera target Z position when marker is moved
            setCameraTargetZ(position);
            // Also notify parent component immediately (not throttled)
            if (onPositionUpdate) {
              onPositionUpdate(position);
              // Update our tracking refs to prevent duplicate updates
              lastReportedPositionRef.current = position;
              lastPositionUpdateRef.current = Date.now();
            }
          }}
          onCameraPositionChange={(position) => {
            if (onCameraPositionChange) {
              onCameraPositionChange(position);
            }
          }}
          onCameraStateChange={(state) => {
            // Only log in debug mode
            if (debugMode) {
              logger.debug('[TimelineVisualization] Passing camera state:', {
                id: Date.now(),
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
                zoom: state.zoom.toFixed(2),
                targetIsZero: state.target.x === 0 && state.target.y === 0 && state.target.z === 0,
                zoomIsOne: state.zoom === 1
              });
            }

            if (onCameraStateChange) {
              // Create a clean state object with proper Vector3 instances before passing up
              const cleanState: CameraState = {
                position: new Vector3(
                  Number(state.position.x),
                  Number(state.position.y),
                  Number(state.position.z)
                ),
                target: new Vector3(
                  Number(state.target.x),
                  Number(state.target.y),
                  Number(state.target.z)
                ),
                zoom: Number(state.zoom)
              };

              onCameraStateChange(cleanState);
            }
          }}
          initialCameraState={initialCameraState}
          debugMode={debugMode}
        />
      </div>

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
                    onClick={() => {
                      // Load mock data and clear error state
                      const mockGitEvents = mockGitHistory();
                      const mockSpecEvents = mockSpecHistory();

                      // Update the parent component with mock data
                      if (onDataLoaded) {
                        onDataLoaded(mockGitEvents, mockSpecEvents, true, true);
                      }

                      // Clear error state
                      if (onError) {
                        onError(null);
                      }

                      // Force a refresh with mock data
                      refresh();
                    }}
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
};
