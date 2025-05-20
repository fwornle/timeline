import React, { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import TopBar from '../components/TopBar';
import BottomBar from '../components/BottomBar';
import { usePreferences } from '../context/PreferencesContext';
import { useLogger } from '../utils/logging/hooks/useLogger';

const API_BASE_URL = 'http://localhost:3030/api/v1';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const logger = useLogger({ component: 'MainLayout', topic: 'ui' });
  const { preferences, setPreferences } = usePreferences();
  const [repoUrl, setRepoUrl] = useState(preferences.repoUrl || 'https://github.com/example/repo.git');
  const [animationSpeed, setAnimationSpeed] = useState(preferences.animationSpeed || 1);
  const [autoDrift, setAutoDrift] = useState(preferences.autoDrift || false);
  const [gitCount, setGitCount] = useState(0);
  const [specCount, setSpecCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isGitHistoryMocked, setIsGitHistoryMocked] = useState(false);
  const [isSpecHistoryMocked, setIsSpecHistoryMocked] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [forceReloadFlag, setForceReloadFlag] = useState(false);
  const [viewAllMode, setViewAllMode] = useState(false);
  const [focusCurrentMode, setFocusCurrentMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [timelineStartDate, setTimelineStartDate] = useState<Date | undefined>(undefined);
  const [timelineEndDate, setTimelineEndDate] = useState<Date | undefined>(undefined);
  const [timelineLength, setTimelineLength] = useState(100);

  // Log debug mode changes
  useEffect(() => {
    logger.info('Debug mode changed', { debugMode });
    console.debug('Debug mode is now:', debugMode);
  }, [debugMode, logger]);

  // Update preferences when state changes
  useEffect(() => {
    setPreferences({
      ...preferences,
      repoUrl,
      animationSpeed,
      autoDrift
    });
  }, [repoUrl, animationSpeed, autoDrift]);

  // Handle repository URL change
  const handleRepoUrlChange = useCallback((url: string) => {
    setRepoUrl(url);
    // Reset counts when repo changes
    setGitCount(0);
    setSpecCount(0);
    setIsLoading(true);
    setIsGitHistoryMocked(false);
    setIsSpecHistoryMocked(false);
    logger.info('Repository URL changed', { url });
  }, []);

  // Handle loading state change from TimelineVisualization
  const handleLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
    logger.info('Loading state changed', { loading });
  };

  // Handle timeline refresh (reset position)
  const handleRefreshTimeline = () => {
    // Reset the position to 0
    setCurrentPosition(0);

    // Create a reset flag to pass to children
    const resetEvent = new CustomEvent('timeline-reset');
    window.dispatchEvent(resetEvent);

    logger.info('Timeline position reset');
  };

  // Handle soft reload (purge cache files but keep repo)
  const handleReloadData = useCallback(() => {
    if (isLoading) {
      logger.warn('Soft reload requested but ignored - already loading data');
      return;
    }
    logger.info('Soft reload requested');
    setIsLoading(true); // Set loading state immediately to prevent multiple clicks

    // Toggle the force reload flag to trigger a reload
    // This will be detected by the TimelineVisualization component
    setForceReloadFlag(prev => !prev);

    // Log the new value for debugging
    logger.debug('Force reload flag toggled', { newValue: !forceReloadFlag });
  }, [logger, isLoading, forceReloadFlag]);

  // Handle hard reload (purge cache files and repo)
  const handleHardReload = useCallback(async () => {
    if (isLoading) {
      logger.warn('Hard reload requested but ignored - already loading data');
      return;
    }

    logger.info('Hard reload requested');
    setIsLoading(true);
    try {
      // Purge the cache first
      const response = await fetch(`${API_BASE_URL}/purge/hard?repository=${encodeURIComponent(repoUrl)}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to purge cache: ${await response.text()}`);
      }

      // Then trigger a normal reload
      setForceReloadFlag(prev => !prev);

      // Log the new value for debugging
      logger.debug('Force reload flag toggled for hard reload', { newValue: !forceReloadFlag });
    } catch (error) {
      logger.error('Error during hard reload:', { error });
      setIsLoading(false); // Reset loading state on error
    }
  }, [repoUrl, logger, isLoading, forceReloadFlag]);

  // Handle camera view mode changes
  const handleViewAllClick = () => {
    logger.info('View All button clicked - setting camera to view all mode');
    // First set both modes to false to ensure a state change even if already in view all mode
    setViewAllMode(false);
    setFocusCurrentMode(false);

    // Use setTimeout to ensure the state update has time to process
    setTimeout(() => {
      setViewAllMode(true);

      // Reset after a longer delay to ensure the animation completes
      setTimeout(() => {
        setViewAllMode(false);
        logger.info('View All mode reset');
      }, 3000);
    }, 50);
  };

  const handleFocusCurrentClick = () => {
    logger.info('Focus button clicked - setting camera to focus on current position');
    // First set both modes to false to ensure a state change even if already in focus mode
    setViewAllMode(false);
    setFocusCurrentMode(false);

    // Use setTimeout to ensure the state update has time to process
    setTimeout(() => {
      setFocusCurrentMode(true);

      // Reset after a longer delay to ensure the animation completes
      setTimeout(() => {
        setFocusCurrentMode(false);
        logger.info('Focus mode reset');
      }, 3000);
    }, 50);
  };

  // Create a modified version of children with additional props
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      // Get child type name in a simpler way
      const childType = child.type.toString();
      console.debug('MainLayout processing child:', {
        childType,
        childProps: Object.keys(child.props || {})
      });

      // Define type for route props
      interface RouteProps {
        routeProps?: {
          onLoadingChange?: (loading: boolean) => void;
          onEventCountsChange?: (gitCount: number, specCount: number) => void;
          onMockStatusChange?: (isGitHistoryMocked: boolean, isSpecHistoryMocked: boolean) => void;
          onPositionChange?: (position: number) => void;
          onTimelineDatesChange?: (startDate: Date, endDate: Date) => void;
          onTimelineLengthChange?: (timelineLength: number) => void;
          forceReload?: boolean;
          viewAllMode?: boolean;
          focusCurrentMode?: boolean;
          debugMode?: boolean;
        }
      }

      // Detect AppRoutes (from React Router) - this is likely what we have
      if (childType.includes('AppRoutes') || childType.includes('Routes')) {
        console.debug('Found Routes component, need to pass props to its children');

        // For Routes, pass a routeProps object with all callbacks
        try {
          return React.cloneElement(child as React.ReactElement<RouteProps>, {
            routeProps: {
              onLoadingChange: handleLoadingChange,
              onEventCountsChange: (gitCount: number, specCount: number) => {
                console.debug('MainLayout.setGitCount/setSpecCount via routeProps:', { gitCount, specCount });
                setGitCount(gitCount);
                setSpecCount(specCount);
              },
              onMockStatusChange: (gitMocked: boolean, specMocked: boolean) => {
                console.debug('MainLayout.setIsMocked via routeProps:', { gitMocked, specMocked });
                setIsGitHistoryMocked(gitMocked);
                setIsSpecHistoryMocked(specMocked);
              },
              onPositionChange: (pos: number) => setCurrentPosition(pos),
              onTimelineDatesChange: (startDate: Date, endDate: Date) => {
                console.debug('MainLayout received timeline dates:', {
                  startDate: startDate.toISOString(),
                  endDate: endDate.toISOString()
                });
                setTimelineStartDate(startDate);
                setTimelineEndDate(endDate);
              },
              onTimelineLengthChange: (length: number) => {
                console.debug('MainLayout received timeline length:', { length });
                setTimelineLength(length);
              },
              forceReload: forceReloadFlag,
              viewAllMode: viewAllMode,
              focusCurrentMode: focusCurrentMode,
              debugMode: debugMode
            }
          });
        } catch (e) {
          console.error('Error cloning Routes element:', e);
          return child;
        }
      }

      // For direct components, pass props directly
      return child;
    }
    return child;
  });

  // Debug output to track state and props
  useEffect(() => {
    console.debug('MainLayout state:', {
      repoUrl,
      animationSpeed,
      autoDrift,
      gitCount,
      specCount,
      isLoading,
      isGitHistoryMocked,
      isSpecHistoryMocked,
      currentPosition,
      timelineStartDate,
      timelineEndDate,
      timelineLength,
      forceReloadFlag,
      viewAllMode,
      focusCurrentMode,
      debugMode,
    });
  }, [
    repoUrl, animationSpeed, autoDrift, gitCount, specCount,
    isLoading, isGitHistoryMocked, isSpecHistoryMocked, currentPosition, timelineStartDate,
    timelineEndDate, timelineLength, forceReloadFlag, viewAllMode, focusCurrentMode, debugMode
  ]);

  useEffect(() => {
    console.debug('MainLayout mock status:', { isGitHistoryMocked, isSpecHistoryMocked });
  }, [isGitHistoryMocked, isSpecHistoryMocked]);

  return (
    <div className="d-flex flex-column vh-100 p-0 m-0 overflow-hidden">
      <TopBar
        onRepoUrlChange={handleRepoUrlChange}
        onReloadData={handleReloadData}
        onHardReload={handleHardReload}
        isLoading={isLoading}
      />
      <main className="flex-grow-1 position-relative p-0 m-0 overflow-hidden">
        {childrenWithProps}
      </main>
      <BottomBar
        gitCount={gitCount}
        specCount={specCount}
        isLoading={isLoading}
        isGitHistoryMocked={isGitHistoryMocked}
        isSpecHistoryMocked={isSpecHistoryMocked}
        currentPosition={currentPosition}
        animationSpeed={animationSpeed}
        autoDrift={autoDrift}
        debugMode={debugMode}
        startDate={timelineStartDate}
        endDate={timelineEndDate}
        timelineLength={timelineLength}
        onAnimationSpeedChange={setAnimationSpeed}
        onAutoDriftChange={setAutoDrift}
        onViewAllClick={handleViewAllClick}
        onFocusCurrentClick={handleFocusCurrentClick}
        onDebugModeChange={(enabled) => {
          console.debug('MainLayout received debug mode change:', enabled);
          setDebugMode(enabled);
        }}
        onResetTimeline={handleRefreshTimeline}
      />
    </div>
  );
};

export default MainLayout;