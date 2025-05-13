import React from 'react';
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

export const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({
  repoUrl,
  animationSpeed,
  autoDrift,
  onLoadingChange,
  onError,
}) => {
  const logger = useLogger({ component: 'TimelineVisualization', topic: 'ui' });

  // Timeline data integration
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

  // Animation state integration
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

  // Update parent loading state
  React.useEffect(() => {
    onLoadingChange(isLoading);
  }, [isLoading, onLoadingChange]);

  // Update parent error state
  React.useEffect(() => {
    // If any source has an error, pass the first error encountered
    const firstError = errors.git || errors.spec || null;
    onError(firstError);
  }, [errors, onError]);

  // Update animation speed when prop changes
  React.useEffect(() => {
    setScrollSpeed(animationSpeed);
    logger.info('Animation speed updated', { speed: animationSpeed });
  }, [animationSpeed, setScrollSpeed, logger]);

  // Update auto-drift when prop changes
  React.useEffect(() => {
    if (autoDrift !== isAutoScrolling) {
      toggleAutoScroll();
      logger.info('Auto-drift state updated', { enabled: autoDrift });
    }
  }, [autoDrift, isAutoScrolling, toggleAutoScroll, logger]);

  // Log significant state changes
  React.useEffect(() => {
    if (events.length > 0) {
      logger.info('Timeline data loaded', {
        eventCount: events.length,
        periodStart: period?.start,
        periodEnd: period?.end,
      });
    }
  }, [events, period, logger]);

  const handleRefresh = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    refresh();
  }, [refresh]);

  const handleRetry = React.useCallback((source: 'git' | 'spec') => (e: React.MouseEvent) => {
    e.preventDefault();
    retry(source);
  }, [retry]);

  // Early return for initial loading state
  if (isLoading && events.length === 0) {
    return (
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
  }

  // Show error state with retry options
  if (hasError && events.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center space-y-4 max-w-lg px-4">
          <p className="text-red-500 text-xl">Error loading timeline data</p>
          {errors.git && (
            <div className="bg-red-900/30 p-4 rounded-lg mb-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-red-400 font-medium">Git History Error:</p>
                <button
                  onClick={handleRetry('git')}
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
                  onClick={handleRetry('spec')}
                  className="text-sm px-3 py-1 bg-red-700 hover:bg-red-800 rounded transition-colors"
                >
                  Retry Spec
                </button>
              </div>
              <p className="text-gray-400">{errors.spec.message}</p>
            </div>
          )}
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Retry All
          </button>
          {events.length > 0 && (
            <p className="text-sm text-gray-400 mt-4">
              Showing partial timeline data. Click retry to load all data.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show loading overlay for partial updates
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
                  onClick={handleRetry('git')}
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
                  onClick={handleRetry('spec')}
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