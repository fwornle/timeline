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

// Separate Welcome component to avoid conditional rendering issues
const WelcomeMessage: React.FC = () => (
  <div className="absolute inset-0 flex items-center justify-center text-foreground">
    <div className="text-center max-w-md px-6 py-8 bg-card/40 backdrop-blur-md rounded-xl shadow-xl border border-border">
      <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
        </svg>
      </div>
      <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Welcome to Timeline</h2>
      <p className="text-muted-foreground mb-6 text-lg">
        Please enter a Git repository URL in the field above to visualize its history.
      </p>
      <div className="bg-muted/50 p-5 rounded-lg text-left text-sm border border-border">
        <p className="mb-3 text-foreground font-medium">Supported formats:</p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary">1</span>
            <span>HTTPS: <code className="px-1.5 py-0.5 bg-primary/10 rounded text-primary">https://github.com/username/repo.git</code></span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary">2</span>
            <span>SSH: <code className="px-1.5 py-0.5 bg-primary/10 rounded text-primary">git@github.com:username/repo.git</code></span>
          </li>
          <li className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
            <span className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">ℹ</span>
            <span>Enterprise GitHub instances are also supported</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
);

// Loading component
const LoadingView: React.FC<{ sources: any }> = ({ sources }) => (
  <div className="h-full flex flex-col items-center justify-center bg-gray-900 text-white">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4" />
    <div className="text-center space-y-2">
      {sources.git.isLoading && (
        <p className="text-blue-400">Loading git history...</p>
      )}
      {sources.spec.isLoading && (
        <p className="text-blue-400">Loading spec history...</p>
      )}
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
  <div className="h-full flex items-center justify-center bg-gray-900 text-white">
    <div className="text-center space-y-4 max-w-lg px-4">
      <p className="text-red-500 text-xl">Error loading timeline data</p>
      {errors.git && (
        <div className="bg-red-900/30 p-4 rounded-lg mb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-red-400 font-medium">Git History Error:</p>
            <button
              onClick={onRetryGit}
              className="text-sm px-3 py-1 bg-red-700 hover:bg-red-800 rounded transition-colors"
            >
              Retry Git
            </button>
          </div>
          <p className="text-gray-400">{errors.git.message}</p>
        </div>
      )}
      {errors.spec && (
        <div className="bg-red-900/30 p-4 rounded-lg mb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-red-400 font-medium">Spec History Error:</p>
            <button
              onClick={onRetrySpec}
              className="text-sm px-3 py-1 bg-red-700 hover:bg-red-800 rounded transition-colors"
            >
              Retry Spec
            </button>
          </div>
          <p className="text-gray-400">{errors.spec.message}</p>
        </div>
      )}
      <button
        onClick={onRetryAll}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
      >
        Retry All
      </button>
      {hasPartialData && (
        <p className="text-sm text-gray-400 mt-4">
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
    const firstError = errors.git || errors.spec || null;
    onError(firstError);
  }, [errors, onError]);

  // Update animation speed when prop changes
  useEffect(() => {
    setScrollSpeed(animationSpeed);
    logger.info('Animation speed updated', { speed: animationSpeed });
  }, [animationSpeed, setScrollSpeed, logger]);

  // Update auto-drift when prop changes
  useEffect(() => {
    if (autoDrift !== isAutoScrolling) {
      toggleAutoScroll();
      logger.info('Auto-drift state updated', { enabled: autoDrift });
    }
  }, [autoDrift, isAutoScrolling, toggleAutoScroll, logger]);

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
    return <WelcomeMessage />;
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
        <div className="absolute top-4 right-4 flex items-center bg-gray-900/80 rounded-lg p-3 z-10">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mr-3" />
          <div className="text-sm space-y-1">
            {sources.git.isLoading && (
              <p className="text-blue-400">Updating git history...</p>
            )}
            {sources.spec.isLoading && (
              <p className="text-blue-400">Updating spec history...</p>
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
        <div className="absolute bottom-4 right-4 bg-red-900/80 rounded-lg p-3 z-10 max-w-md">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-red-400 font-medium">Partial Data Load Error</p>
              <button
                onClick={handleRefresh}
                className="text-sm px-2 py-1 bg-red-700 hover:bg-red-800 rounded transition-colors"
              >
                Retry All
              </button>
            </div>
            {errors.git && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Git History Failed</span>
                <button
                  onClick={handleRetryGit}
                  className="px-2 py-1 bg-red-700 hover:bg-red-800 rounded transition-colors ml-2"
                >
                  Retry Git
                </button>
              </div>
            )}
            {errors.spec && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Spec History Failed</span>
                <button
                  onClick={handleRetrySpec}
                  className="px-2 py-1 bg-red-700 hover:bg-red-800 rounded transition-colors ml-2"
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