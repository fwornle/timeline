import React, { useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import TopBar from '../components/TopBar';
import BottomBar from '../components/BottomBar';
import { useAppDispatch, useAppSelector } from '../store';
import { usePreferencesMigration } from '../store/hooks/usePreferencesMigration';
import {
  setIsInitializing,
  setDebugMode,
  setFocusCurrentMode
} from '../store/slices/uiSlice';
import {
  resetTimeline
} from '../store/slices/timelineSlice';
import {
  setRepositoryUrl,
  setUsername
} from '../store/slices/repositorySlice';
import {
  updateAnimationPreferences,
  updateRepositoryPreferences
} from '../store/intents/preferencesIntents';
import {
  updateTimelinePosition,
  toggleViewAll,
  toggleDroneMode,
  updateCameraWithSync
} from '../store/intents/uiIntents';
import { fetchTimelineData } from '../store/intents/timelineIntents';
import type { CameraState } from '../components/three/TimelineCamera';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayoutRedux: React.FC<MainLayoutProps> = ({ children }) => {
  const dispatch = useAppDispatch();

  // Use preferences migration hook for backward compatibility
  const { preferences } = usePreferencesMigration();

  // Select state from store
  const {
    animationSpeed,
    autoDrift,
    droneMode,
    viewAll: viewAllMode,
    focusCurrentMode,
    debugMode,
    cameraState,
  } = useAppSelector(state => state.ui);

  const {
    loading: isLoading,
    gitCount,
    specCount,
    currentPosition,
    isUsingMockData,
  } = useAppSelector(state => state.timeline);

  const {
    url: repoUrl,
  } = useAppSelector(state => state.repository);

  // Local state for timeline metadata
  const [timelineStartDate, setTimelineStartDate] = React.useState<Date | undefined>(undefined);
  const [timelineEndDate, setTimelineEndDate] = React.useState<Date | undefined>(undefined);
  const [timelineLength, setTimelineLength] = React.useState(100);
  const [forceReloadFlag, setForceReloadFlag] = React.useState(false);
  const [cameraPosition, setCameraPosition] = React.useState({ x: -35, y: 30, z: -50 });

  // Derived state
  const isGitHistoryMocked = isUsingMockData;
  const isSpecHistoryMocked = isUsingMockData;

  // Create a ref to track initialization
  const hasInitializedRef = useRef(false);

  // Initialize from preferences
  useEffect(() => {
    if (!hasInitializedRef.current && preferences.repoUrl) {
      hasInitializedRef.current = true;
      dispatch(setRepositoryUrl(preferences.repoUrl));
      if (preferences.username) {
        dispatch(setUsername(preferences.username));
      }
      dispatch(setIsInitializing(false));
    }
  }, [dispatch, preferences]);

  // Timeline reset event listener
  useEffect(() => {
    const handleTimelineReset = () => {
      dispatch(resetTimeline());
      setForceReloadFlag(prev => !prev);
    };

    window.addEventListener('timeline-reset', handleTimelineReset);
    return () => window.removeEventListener('timeline-reset', handleTimelineReset);
  }, [dispatch]);

  // Handlers that dispatch intents
  const handleRepoUrlChange = useCallback((url: string) => {
    dispatch(setRepositoryUrl(url));
    dispatch(updateRepositoryPreferences({ repoUrl: url }));
  }, [dispatch]);

  const handleAnimationSpeedChange = useCallback((speed: number) => {
    dispatch(updateAnimationPreferences({ speed }));
  }, [dispatch]);

  const handleAutoDriftChange = useCallback((enabled: boolean) => {
    dispatch(updateAnimationPreferences({ autoDrift: enabled }));
  }, [dispatch]);

  const handleDroneModeToggle = useCallback(() => {
    dispatch(toggleDroneMode());
  }, [dispatch]);

  const handleViewAllToggle = useCallback(() => {
    dispatch(toggleViewAll());
  }, [dispatch]);

  const handleFocusCurrentModeChange = useCallback((enabled: boolean) => {
    dispatch(setFocusCurrentMode(enabled));
  }, [dispatch]);

  const handleDebugModeChange = useCallback((enabled: boolean) => {
    dispatch(setDebugMode(enabled));
  }, [dispatch]);

  const handlePositionChange = useCallback((position: number) => {
    dispatch(updateTimelinePosition({ position }));
  }, [dispatch]);

  const handleCameraStateChange = useCallback((newState: CameraState) => {
    dispatch(updateCameraWithSync({
      position: newState.position,
      target: newState.target,
      zoom: newState.zoom,
    }));
  }, [dispatch]);

  const handleTimelineDataFetch = useCallback((sourceType: 'git' | 'spec' | 'both', useMockData = false) => {
    if (repoUrl) {
      dispatch(fetchTimelineData({ repoUrl, sourceType, useMockData }));
    }
  }, [dispatch, repoUrl]);

  // Create props for TopBar
  const topBarProps = {
    onRepoUrlChange: handleRepoUrlChange,
    onReloadData: () => setForceReloadFlag(prev => !prev),
    onHardReload: () => {
      // Clear cache and force reload
      setForceReloadFlag(prev => !prev);
    },
    isLoading,
  };

  // Create props for BottomBar
  const bottomBarProps = {
    gitCount,
    specCount,
    isLoading,
    isGitHistoryMocked,
    isSpecHistoryMocked,
    currentPosition,
    cameraPosition,
    cameraState,
    animationSpeed,
    autoDrift,
    droneMode,
    debugMode,
    startDate: timelineStartDate,
    endDate: timelineEndDate,
    timelineLength,
    onAnimationSpeedChange: handleAnimationSpeedChange,
    onAutoDriftChange: handleAutoDriftChange,
    onDroneModeChange: handleDroneModeToggle,
    onViewAllClick: handleViewAllToggle,
    onFocusCurrentClick: () => handleFocusCurrentModeChange(true),
    onDebugModeChange: handleDebugModeChange,
    onResetTimeline: () => {
      // Reset timeline position
      dispatch(updateTimelinePosition({ position: 0 }));
    },
  };

  // Create props for Home component (passed through AppRoutes)
  const homeProps = {
    onLoadingChange: (_loading: boolean) => {
      // Handle loading state changes if needed
    },
    onEventCountsChange: (_gitCount: number, _specCount: number) => {
      // These are handled by Redux store updates
    },
    onMockStatusChange: (_isGitHistoryMocked: boolean, _isSpecHistoryMocked: boolean) => {
      // These are handled by Redux store updates
    },
    onPositionChange: handlePositionChange,
    onCameraPositionChange: (position: any) => {
      setCameraPosition({ x: position.x, y: position.y, z: position.z });
    },
    onCameraStateChange: handleCameraStateChange,
    initialCameraState: cameraState,
    initialMarkerPosition: currentPosition,
    onTimelineDatesChange: (startDate: Date, endDate: Date) => {
      setTimelineStartDate(startDate);
      setTimelineEndDate(endDate);
    },
    onTimelineLengthChange: setTimelineLength,
    forceReload: forceReloadFlag,
    viewAllMode,
    focusCurrentMode,
    debugMode,
    droneMode,
  };

  return (
    <div className="main-layout d-flex flex-column vh-100">
      <TopBar {...topBarProps} />
      <main className="flex-fill overflow-hidden">
        {React.cloneElement(children as React.ReactElement<any>, { routeProps: homeProps })}
      </main>
      <BottomBar {...bottomBarProps} />
    </div>
  );
};

export default MainLayoutRedux;