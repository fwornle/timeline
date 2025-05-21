import React, { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import TopBar from '../components/TopBar';
import BottomBar from '../components/BottomBar';
import { usePreferences } from '../context/PreferencesContext';
import { useLogger } from '../utils/logging/hooks/useLogger';
import type { CameraState } from '../components/three/TimelineCamera';
import { Vector3 } from 'three';

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
  const [cameraPosition, setCameraPosition] = useState({ x: -60, y: 70, z: -50 }); // Initialize with default camera position

  // Initialize with default camera state
  const [cameraState, setCameraState] = useState<CameraState>(() => {
    // Try to load from preferences first
    if (preferences.cameraState) {
      try {
        const storedState = preferences.cameraState;
        return {
          position: new Vector3(
            storedState.position.x,
            storedState.position.y,
            storedState.position.z
          ),
          target: new Vector3(
            storedState.target.x,
            storedState.target.y,
            storedState.target.z
          ),
          zoom: storedState.zoom
        };
      } catch (error) {
        console.error('Failed to load camera state from preferences', error);
      }
    }
    
    // Default state if not available in preferences
    return {
      position: new Vector3(-60, 70, -50),
      target: new Vector3(0, 0, 0),
      zoom: 1
    };
  });
  const [forceReloadFlag, setForceReloadFlag] = useState(false);
  const [viewAllMode, setViewAllMode] = useState(false);
  const [focusCurrentMode, setFocusCurrentMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [timelineStartDate, setTimelineStartDate] = useState<Date | undefined>(undefined);
  const [timelineEndDate, setTimelineEndDate] = useState<Date | undefined>(undefined);
  const [timelineLength, setTimelineLength] = useState(100);

  // Debug mode effect
  useEffect(() => {
    console.log('MainLayout: Debug mode effect triggered, debugMode is:', debugMode);
    
    // Force camera state updates when debug mode is enabled
    if (debugMode) {
      // This will help with debug mode cycling
      console.log('Debug mode enabled - making sure camera state is fresh');
    }
  }, [debugMode]);

  // Load camera state from preferences on startup - this can be removed since we're initializing in the useState above
  useEffect(() => {
    if (preferences.cameraState) {
      try {
        // Convert the stored camera state back to a proper CameraState object
        const storedState = preferences.cameraState;
        const restoredState: CameraState = {
          position: new Vector3(
            storedState.position.x,
            storedState.position.y,
            storedState.position.z
          ),
          target: new Vector3(
            storedState.target.x,
            storedState.target.y,
            storedState.target.z
          ),
          zoom: storedState.zoom
        };

        setCameraState(restoredState);

        // Also update the camera position for backward compatibility
        setCameraPosition({
          x: storedState.position.x,
          y: storedState.position.y,
          z: storedState.position.z
        });

        logger.info('Loaded camera state from preferences', { restoredState });
      } catch (error) {
        logger.error('Failed to load camera state from preferences', { error });
      }
    }
  }, [preferences.cameraState]);

  // Update preferences when state changes
  useEffect(() => {
    setPreferences({
      ...preferences,
      repoUrl,
      animationSpeed,
      autoDrift,
      cameraState: cameraState
    });
  }, [repoUrl, animationSpeed, autoDrift, cameraState]);

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

      // Only log in debug mode
      if (debugMode) {
        logger.debug('Processing child component', {
          childType,
          childProps: Object.keys(child.props || {})
        });
      }

      // Define type for route props
      interface RouteProps {
        routeProps?: {
          onLoadingChange?: (loading: boolean) => void;
          onEventCountsChange?: (gitCount: number, specCount: number) => void;
          onMockStatusChange?: (isGitHistoryMocked: boolean, isSpecHistoryMocked: boolean) => void;
          onPositionChange?: (position: number) => void;
          onCameraPositionChange?: (position: { x: number, y: number, z: number }) => void;
          onCameraStateChange?: (state: CameraState) => void;
          initialCameraState?: CameraState;
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
        if (debugMode) {
          logger.debug('Found Routes component, passing props to children');
        }

        // For Routes, pass a routeProps object with all callbacks
        try {
          return React.cloneElement(child as React.ReactElement<RouteProps>, {
            routeProps: {
              onLoadingChange: handleLoadingChange,
              onEventCountsChange: (gitCount: number, specCount: number) => {
                setGitCount(gitCount);
                setSpecCount(specCount);
              },
              onMockStatusChange: (gitMocked: boolean, specMocked: boolean) => {
                setIsGitHistoryMocked(gitMocked);
                setIsSpecHistoryMocked(specMocked);
              },
              onPositionChange: (pos: number) => setCurrentPosition(pos),
              onCameraPositionChange: (pos: { x: number, y: number, z: number }) => {
                setCameraPosition(pos);
              },
              onCameraStateChange: (state: CameraState) => {
                console.log('MainLayout received camera state change:', {
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
                setCameraState(state);
              },
              initialCameraState: cameraState,
              onTimelineDatesChange: (startDate: Date, endDate: Date) => {
                setTimelineStartDate(startDate);
                setTimelineEndDate(endDate);
              },
              onTimelineLengthChange: (length: number) => {
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

  // Debug output to track state and props only when in debug mode
  useEffect(() => {
    if (debugMode) {
      logger.debug('MainLayout state updated', {
        repoUrl,
        animationSpeed,
        autoDrift,
        gitCount,
        specCount,
        isLoading,
        isGitHistoryMocked,
        isSpecHistoryMocked,
        currentPosition,
        timelineLength
      });
    }
  }, [
    repoUrl, animationSpeed, autoDrift, gitCount, specCount,
    isLoading, isGitHistoryMocked, isSpecHistoryMocked, currentPosition,
    timelineLength, debugMode, logger
  ]);

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
        cameraPosition={cameraPosition}
        cameraState={cameraState}
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
          console.log('MainLayout: Debug mode change requested from BottomBar:', enabled);
          // Immediately update the state
          setDebugMode(enabled);
          
          // If enabling debug mode, force a camera state update
          if (enabled && cameraState) {
            console.log('Forcing camera state update due to debug mode activation');
            // Create a new object to ensure state change is detected
            const refreshedState = {
              position: new Vector3(
                cameraState.position.x,
                cameraState.position.y,
                cameraState.position.z
              ),
              target: new Vector3(
                cameraState.target.x,
                cameraState.target.y,
                cameraState.target.z
              ),
              zoom: cameraState.zoom
            };
            setCameraState(refreshedState);
          }
          
          // Log again to verify state update
          setTimeout(() => {
            console.log('MainLayout: Debug mode updated to:', enabled);
          }, 10);
        }}
        onResetTimeline={handleRefreshTimeline}
        onSaveCameraState={(state) => {
          setCameraState(state);

          // Show a confirmation message
          alert('Camera view saved! This view will be restored when you restart the app.');
        }}
      />
    </div>
  );
};

export default MainLayout;