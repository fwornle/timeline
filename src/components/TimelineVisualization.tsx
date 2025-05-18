import React, { useState, useEffect, useCallback } from 'react';
import { useLogger } from '../utils/logging/hooks/useLogger';
import { useTimelineData } from '../data/hooks/useTimelineData';
import { useTimelineAnimation } from '../animation/useTimelineAnimation';
import { TimelineScene } from './three/TimelineScene';
import type { TimelineEvent } from '../data/types/TimelineEvent';
import { mockGitHistory } from '../data/mocks/mockGitHistory';
import { mockSpecHistory } from '../data/mocks/mockSpecHistory';

interface TimelineVisualizationProps {
  repoUrl: string;
  animationSpeed: number;
  autoDrift: boolean;
  onLoadingChange: (isLoading: boolean) => void;
  onError: (error: Error | null) => void;
  onDataLoaded?: (gitEvents: TimelineEvent[], specEvents: TimelineEvent[], isMocked: boolean) => void;
  onPositionUpdate?: (position: number) => void;
  forceReload?: boolean;
  viewAllMode?: boolean;
  focusCurrentMode?: boolean;
  debugMode?: boolean;
}

// Loading component
const LoadingView: React.FC<{
  sources: {
    git: { isLoading: boolean };
    spec: { isLoading: boolean };
  };
}> = ({ sources }) => (
  <div className="h-full flex items-center justify-center bg-light">
    <div className="text-center space-y-4">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      <p className="text-xl font-medium">Loading timeline data...</p>
      <div className="space-y-2 text-sm text-muted">
        {sources.git.isLoading && <p>Fetching git history...</p>}
        {sources.spec.isLoading && <p>Fetching spec history...</p>}
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
  forceReload = false,
  viewAllMode: externalViewAllMode = false,
  focusCurrentMode: externalFocusCurrentMode = false,
  debugMode = false,
}) => {
  // Always initialize hooks regardless of repoUrl to maintain hook order
  const logger = useLogger({ component: 'TimelineVisualization', topic: 'ui' });

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
    usingMockedData,
  } = useTimelineData(repoUrl);

  // Handle force reload when the prop changes
  useEffect(() => {
    if (forceReload && repoUrl) {
      logger.info('Forcing data reload with cache purge', { repoUrl });
      // Use purgeAndRefresh to clear the cache first, then reload
      purgeAndRefresh();
    }
  }, [forceReload, repoUrl, purgeAndRefresh, logger]);

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
  } = useTimelineAnimation({
    enableAutoScroll: autoDrift,
    initialScrollSpeed: animationSpeed,
  });

  // Determine which view to show based on state - with stable error handling
  useEffect(() => {
    // Welcome screen logic remains the same
    setShowWelcome(!repoUrl);

    // Only show loading on initial load, not during error states
    if (!!repoUrl && isLoading && events.length === 0 && !hasError) {
      setShowLoading(true);
      setShowError(false);
    }
    // Show error screen and keep it stable
    else if (!!repoUrl && !!hasError && events.length === 0) {
      setShowLoading(false);
      setShowError(true);
    }
    // Normal state - no error, no loading
    else if (!isLoading) {
      setShowLoading(false);
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

      // Reset camera to the beginning of the timeline (Z=0)
      if (events.length > 0) {
        // Sort events by timestamp to find the earliest
        const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const firstEvent = sortedEvents[0];
        
        // Select the first event (which should be at Z=0)
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

  // Update position for parent component
  useEffect(() => {
    if (onPositionUpdate && cameraTarget) {
      // Use the z position as the timeline position
      onPositionUpdate(cameraTarget.z);
      console.debug('Position updated:', cameraTarget.z);
    }
  }, [cameraTarget, onPositionUpdate]);

  // Also update position when a card is selected
  useEffect(() => {
    if (onPositionUpdate && selectedCardId) {
      // Access the card positions from the animation hook
      if (cardPositionsRef && cardPositionsRef.current && cardPositionsRef.current.has(selectedCardId)) {
        const position = cardPositionsRef.current.get(selectedCardId)!;
        onPositionUpdate(position.z);
        console.debug('Position updated from card selection:', position.z);
      }
    }
  }, [selectedCardId, onPositionUpdate, cardPositionsRef]);

  // Log significant state changes and notify parent
  useEffect(() => {
    console.debug('TimelineVisualization - events or period changed:', {
      eventsCount: events.length,
      gitCount: events.filter(e => e.type === 'git').length,
      specCount: events.filter(e => e.type === 'spec').length,
      hasDataLoadedCallback: !!onDataLoaded,
      usingMockedData
    });

    // Call onDataLoaded callback when we have events
    if (onDataLoaded && events.length > 0) {
      const gitEvents = events.filter(e => e.type === 'git');
      const specEvents = events.filter(e => e.type === 'spec');
      console.debug('TimelineVisualization calling onDataLoaded with:', {
        gitEventsCount: gitEvents.length,
        specEventsCount: specEvents.length,
        isMocked: usingMockedData,
        callbackName: onDataLoaded.name || 'anonymous function'
      });
      onDataLoaded(gitEvents, specEvents, usingMockedData);
    }
  }, [events, period, onDataLoaded, usingMockedData]);

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
            onDataLoaded(mockGitEvents, mockSpecEvents, true);
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
          currentPosition={cameraTarget.z}
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
                {sources.git.isLoading && <p className="mb-1">Fetching git history...</p>}
                {sources.spec.isLoading && <p className="mb-0">Fetching spec history...</p>}
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
                        onDataLoaded(mockGitEvents, mockSpecEvents, true);
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
