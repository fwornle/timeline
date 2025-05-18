import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import TopBar from '../components/TopBar';
import BottomBar from '../components/BottomBar';
import { usePreferences } from '../context/PreferencesContext';
import { useLogger } from '../utils/logging/hooks/useLogger';

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
  const [isMocked, setIsMocked] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [forceReloadFlag, setForceReloadFlag] = useState(false);
  const [viewAllMode, setViewAllMode] = useState(false);
  const [focusCurrentMode, setFocusCurrentMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [timelineStartDate, setTimelineStartDate] = useState<Date | undefined>(undefined);
  const [timelineEndDate, setTimelineEndDate] = useState<Date | undefined>(undefined);

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
  const handleRepoUrlChange = (url: string) => {
    setRepoUrl(url);
    // Reset counts when repo changes
    setGitCount(0);
    setSpecCount(0);
    setIsLoading(true);
    setIsMocked(false);
    logger.info('Repository URL changed', { url });
  };

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

  // Handle data reload (purge cache and reload from upstream)
  const handleReloadData = () => {
    // Reset counts
    setGitCount(0);
    setSpecCount(0);
    setIsLoading(true);
    setIsMocked(false);

    // Force a refresh of the data
    logger.info('Forcing data reload from upstream repository');

    // Toggle the flag to trigger a re-render with forceReload=true
    setForceReloadFlag(prev => !prev);

    // The Home component will handle the reload based on the forceReload prop
    // which will be passed through the cloneElement below
  };

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
          onCacheStatusChange?: (mocked: boolean) => void;
          onPositionChange?: (position: number) => void;
          onTimelineDatesChange?: (startDate: Date, endDate: Date) => void;
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
              onCacheStatusChange: (mocked: boolean) => {
                console.debug('MainLayout.setIsMocked via routeProps:', { mocked });
                setIsMocked(mocked);
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
      gitCount,
      specCount,
      isMocked,
      isLoading
    });
  }, [gitCount, specCount, isMocked, isLoading]);

  return (
    <div className="d-flex flex-column vh-100 p-0 m-0 overflow-hidden">
      <TopBar
        onRepoUrlChange={handleRepoUrlChange}
        onReloadData={handleReloadData}
      />
      <main className="flex-grow-1 position-relative p-0 m-0 overflow-hidden">
        {childrenWithProps}
      </main>
      <BottomBar
        gitCount={gitCount}
        specCount={specCount}
        isLoading={isLoading}
        isMocked={isMocked}
        currentPosition={currentPosition}
        animationSpeed={animationSpeed}
        autoDrift={autoDrift}
        debugMode={debugMode}
        startDate={timelineStartDate}
        endDate={timelineEndDate}
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