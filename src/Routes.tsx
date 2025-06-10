import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import type { CameraState } from './components/three/TimelineCamera';
import { Vector3 } from 'three';

// Define the props that will be passed through the router
export interface RouteProps {
  onLoadingChange?: (loading: boolean) => void;
  onEventCountsChange?: (gitCount: number, specCount: number) => void;
  onMockStatusChange?: (isGitHistoryMocked: boolean, isSpecHistoryMocked: boolean) => void;
  onPositionChange?: (pos: number) => void;
  onCameraPositionChange?: (position: Vector3) => void;
  onCameraStateChange?: (state: CameraState) => void;
  initialCameraState?: CameraState;
  initialMarkerPosition?: number;
  onTimelineDatesChange?: (startDate: Date, endDate: Date) => void;
  onTimelineLengthChange?: (timelineLength: number) => void;
  forceReload?: boolean;
  viewAllMode?: boolean;
  focusCurrentMode?: boolean;
  debugMode?: boolean;
  droneMode?: boolean;
}

const AppRoutes: React.FC<RouteProps> = (props) => {
  return (
    <Routes>
      <Route path="/" element={<Home {...props} />} />
      <Route path="/about" element={<About />} />
    </Routes>
  );
};

export default AppRoutes;