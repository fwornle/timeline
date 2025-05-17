import React, { useState, useEffect, useCallback } from 'react';
import { useLogger } from '../utils/logging/hooks/useLogger';
import { useTimelineData } from '../data/hooks/useTimelineData';
import { useTimelineAnimation } from '../animation/useTimelineAnimation';
import { TimelineScene } from './three/TimelineScene';

interface TimelineVisualizationProps {
  repoUrl: string;
  animationSpeed: number;
  autoDrift: boolean;
  onLoadingChange: (isLoading: boolean) => void;
  onError: (error: Error | null) => void;
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

// Error component
const ErrorView: React.FC<{
  errors: { git: Error | null; spec: Error | null };
  onRetryGit: (e: React.MouseEvent) => void;
  onRetrySpec: (e: React.MouseEvent) => void;
  onRetryAll: (e: React.MouseEvent) => void;
  hasPartialData: boolean;
}> = ({ errors, onRetryGit, onRetrySpec, onRetryAll, hasPartialData }) => (
  <div className="h-full flex items-center justify-center bg-light">
    <div className="text-center space-y-4 max-w-lg px-4">
      <p className="text-danger text-xl">Error loading timeline data</p>
      {errors.git && (
        <div className="bg-danger bg-opacity-10 p-4 rounded-lg mb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-danger font-medium">Git History Error:</p>
            <button
              onClick={onRetryGit}
              className="px-2 py-1 bg-danger text-white rounded-lg text-sm"
            >
              Retry Git
            </button>
          </div>
          <p className="text-sm">{errors.git.message}</p>
        </div>
      )}
      {errors.spec && (
        <div className="bg-danger bg-opacity-10 p-4 rounded-lg mb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-danger font-medium">Spec History Error:</p>
            <button
              onClick={onRetrySpec}
              className="px-2 py-1 bg-danger text-white rounded-lg text-sm"
            >
              Retry Spec
            </button>
          </div>
          <p className="text-sm">{errors.spec.message}</p>
        </div>
      )}
      <button
        onClick={onRetryAll}
        className="px-4 py-2 bg-primary text-white rounded-lg"
      >
        Retry All
      </button>
      {hasPartialData && (
        <p className="text-sm text-muted mt-4">
          Showing partial timeline data. Click retry to load all data.
        </p>
      )}
    </div>
  </div>
);

// Main component
export const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({
  repoUrl,
  animationSpeed,
  autoDrift,
  onLoadingChange,
  onError,
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
    retry,
  } = useTimelineData(repoUrl);

  // Animation state
  const {
    isAutoScrolling,
    selectedCardId,
    cameraTarget,
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

  // Determine which view to show based on state
  useEffect(() => {
    setShowWelcome(!repoUrl);
    setShowLoading(!!repoUrl && isLoading && events.length === 0);
    setShowError(!!repoUrl && !!hasError && events.length === 0);
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

  // Log significant state changes
  useEffect(() => {
    if (events.length > 0) {
      logger.info('Timeline data loaded', {
        eventCount: events.length,
        periodStart: period?.start,
        periodEnd: period?.end,
      });
    }
  }, [events, period, logger]);

  // Event handlers
  const handleRefresh = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    refresh();
  }, [refresh]);

  const handleRetryGit = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    retry('git');
  }, [retry]);

  const handleRetrySpec = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    retry('spec');
  }, [retry]);

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
        errors={errors}
        onRetryGit={handleRetryGit}
        onRetrySpec={handleRetrySpec}
        onRetryAll={handleRefresh}
        hasPartialData={events.length > 0}
      />
    );
  }

  // Show timeline view with optional loading overlay
  const isPartialLoading = isLoading && events.length > 0;

  return (
    <div className="relative h-full">
      {isPartialLoading && (
        <div className="absolute top-4 right-4 flex items-center bg-dark bg-opacity-80 rounded-lg p-3 z-10">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary mr-3" />
          <div className="text-sm space-y-1">
            {sources.git.isLoading && (
              <p className="text-primary">Updating git history...</p>
            )}
            {sources.spec.isLoading && (
              <p className="text-primary">Updating spec history...</p>
            )}
          </div>
        </div>
      )}
      <TimelineScene
        events={events}
        selectedCardId={selectedCardId}
        cameraTarget={cameraTarget}
        onCardSelect={selectCard}
        onCardHover={setHoveredCard}
        onCardPositionUpdate={updateCardPosition}
        getCardAnimationProps={getCardAnimationProps}
      />
      {hasError && events.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-danger bg-opacity-80 rounded-lg p-3 z-10 max-w-md">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-white font-medium">Partial Data Load Error</p>
              <button
                onClick={handleRefresh}
                className="text-sm px-2 py-1 bg-danger hover:bg-danger-dark rounded transition-colors"
              >
                Retry All
              </button>
            </div>
            {errors.git && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-white">Git History Failed</span>
                <button
                  onClick={handleRetryGit}
                  className="px-2 py-1 bg-danger hover:bg-danger-dark rounded transition-colors ml-2"
                >
                  Retry Git
                </button>
              </div>
            )}
            {errors.spec && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-white">Spec History Failed</span>
                <button
                  onClick={handleRetrySpec}
                  className="px-2 py-1 bg-danger hover:bg-danger-dark rounded transition-colors ml-2"
                >
                  Retry Spec
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
