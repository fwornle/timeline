import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';

// Define the props that will be passed through the router
interface AppRoutesProps {
  routeProps?: {
    onLoadingChange?: (loading: boolean) => void;
    onEventCountsChange?: (gitCount: number, specCount: number) => void;
    onMockStatusChange?: (isMocked: boolean) => void;
    onPositionChange?: (pos: number) => void;
    onTimelineDatesChange?: (startDate: Date, endDate: Date) => void;
    onTimelineLengthChange?: (timelineLength: number) => void;
    forceReload?: boolean;
    viewAllMode?: boolean;
    focusCurrentMode?: boolean;
    debugMode?: boolean;
  };
}

const AppRoutes: React.FC<AppRoutesProps> = ({ routeProps }) => {
  console.debug('AppRoutes received routeProps:', {
    hasRouteProps: !!routeProps,
    props: routeProps ? Object.keys(routeProps) : 'none'
  });
  
  return (
    <Routes>
      <Route path="/" element={<Home {...routeProps} />} />
      <Route path="/about" element={<About />} />
    </Routes>
  );
};

export default AppRoutes; 