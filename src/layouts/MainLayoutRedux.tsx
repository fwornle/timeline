import React, { useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import TopBar from '../components/TopBar';
import BottomBar from '../components/BottomBar';
import { useAppDispatch, useAppSelector } from '../store';
import { usePreferencesMigration } from '../store/hooks/usePreferencesMigration';
import {
  setIsInitializing,
  setCameraCyclingMode,
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
  updateCameraWithSync,
  focusOnCurrentPosition,
  toggleDebugModeWithLogging,
  resetTimelineToStart
} from '../store/intents/uiIntents';
import { purgeAndReloadTimeline } from '../store/intents/timelineIntents';
import type { CameraState } from '../components/three/TimelineCamera';
import { Vector3 } from 'three';

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
    cameraCyclingMode,
    cameraState,
  } = useAppSelector(state => state.ui);

  const {
    loading: isLoading,
    gitCount,
    specCount,
    currentPosition,
    isUsingMockData,
  } = useAppSelector(state => state.timeline);


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

    const handleResetFocusCurrentMode = () => {
      dispatch(setFocusCurrentMode(false));
    };

    window.addEventListener('timeline-reset', handleTimelineReset);
    window.addEventListener('resetFocusCurrentMode', handleResetFocusCurrentMode);

    return () => {
      window.removeEventListener('timeline-reset', handleTimelineReset);
      window.removeEventListener('resetFocusCurrentMode', handleResetFocusCurrentMode);
    };
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
    if (enabled) {
      // Use the proper intent for focusing on current position
      dispatch(focusOnCurrentPosition());
    } else {
      dispatch(setFocusCurrentMode(enabled));
    }
  }, [dispatch]);

  const handleDebugModeChange = useCallback((enabled: boolean) => {
    dispatch(toggleDebugModeWithLogging(enabled));
  }, [dispatch]);

  const handleCameraCyclingModeChange = useCallback((enabled: boolean) => {
    dispatch(setCameraCyclingMode(enabled));
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


  // Get repository URL from Redux store
  const repoUrl = useAppSelector(state => state.repository.url);

  // Create props for TopBar
  const topBarProps = {
    onRepoUrlChange: handleRepoUrlChange,
    onReloadData: () => {
      // Use the Redux intent for soft reload
      if (repoUrl) {
        dispatch(purgeAndReloadTimeline({ repoUrl, hard: false }));
      }
    },
    onHardReload: () => {
      // Use the Redux intent for hard reload
      if (repoUrl) {
        dispatch(purgeAndReloadTimeline({ repoUrl, hard: true }));
      }
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
    cameraCyclingMode,
    startDate: timelineStartDate,
    endDate: timelineEndDate,
    timelineLength,
    onAnimationSpeedChange: handleAnimationSpeedChange,
    onAutoDriftChange: handleAutoDriftChange,
    onDroneModeChange: handleDroneModeToggle,
    onViewAllClick: handleViewAllToggle,
    onFocusCurrentClick: () => handleFocusCurrentModeChange(true),
    onDebugModeChange: handleDebugModeChange,
    onCameraCyclingModeChange: handleCameraCyclingModeChange,
    onResetTimeline: () => {
      // Reset timeline to start position
      dispatch(resetTimelineToStart());
    },
  };

  // Create props for Home component (passed through AppRoutes)
  const homeProps = {
    onLoadingChange: () => {
      // Handle loading state changes if needed
    },
    onEventCountsChange: () => {
      // These are handled by Redux store updates
    },
    onMockStatusChange: () => {
      // These are handled by Redux store updates
    },
    onPositionChange: handlePositionChange,
    onCameraPositionChange: (position: Vector3) => {
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
        {React.cloneElement(children as React.ReactElement, { routeProps: homeProps })}
      </main>
      <BottomBar {...bottomBarProps} />
    </div>
  );
};

export default MainLayoutRedux;