import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Use plain objects instead of Three.js Vector3 for Redux serialization
export interface CameraState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  zoom: number;
}

interface UIState {
  // Animation settings
  animationSpeed: number;
  autoDrift: boolean;
  droneMode: boolean;
  isAutoScrolling: boolean;

  // View modes
  viewAll: boolean;
  focusCurrentMode: boolean;
  debugMode: boolean;
  cameraCyclingMode: boolean;
  
  // Performance profiling
  performanceProfilingEnabled: boolean;

  // Camera state
  cameraState: CameraState;

  // Card states
  selectedCardId: string | null;
  hoveredCardId: string | null;
  showThinnedCards: boolean;

  // Viewport filtering states
  visibleEventsCount: number;
  isViewportThinning: boolean;

  // Timeline interaction states
  isMarkerDragging: boolean;
  isTimelineHovering: boolean;

  // Global loading/error states
  globalError: string | null;
  globalLoading: boolean;

  // Occlusion states
  markerFadeOpacity: number;
  debugMarkerFade: boolean;
  fadedCardsTemporalRange: { minTimestamp: number; maxTimestamp: number } | null;

  // Modal states
  showPreferences: boolean;
  showLoggingControl: boolean;

  // Layout states
  sidebarOpen: boolean;

  // Loading states
  isInitializing: boolean;
  isReloadingSoft: boolean;
  isReloadingHard: boolean;

  // Metrics plot states
  metricsPlotExpanded: boolean;
  metricsPlotHoveredPoint: number;
  metricsPlotVisibleMetrics: string[];
  metricsPlotCalendarData: {
    holidays: Array<{ date: string; name: string }>;
    bridgeDays: Array<{ date: string; name: string }>;
    year: number;
    country: string;
  } | null;
  metricsPlotChartDimensions: {
    width: number;
    height: number;
    visibleWidth: number;
    needsScrolling: boolean;
    dayWidth: number;
    visibleDays: number;
  };
}

const initialState: UIState = {
  animationSpeed: 1.0,
  autoDrift: false,
  droneMode: false,
  isAutoScrolling: false,
  viewAll: false,
  focusCurrentMode: false,
  debugMode: false,
  cameraCyclingMode: false,
  performanceProfilingEnabled: false,
  cameraState: {
    position: { x: 0, y: 20, z: 50 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 1,
  },
  selectedCardId: null,
  hoveredCardId: null,
  showThinnedCards: false,
  visibleEventsCount: 0,
  isViewportThinning: false,
  isMarkerDragging: false,
  isTimelineHovering: false,
  globalError: null,
  globalLoading: false,
  markerFadeOpacity: 1.0,
  debugMarkerFade: false,
  fadedCardsTemporalRange: null,
  showPreferences: false,
  showLoggingControl: false,
  sidebarOpen: false,
  isInitializing: true,
  isReloadingSoft: false,
  isReloadingHard: false,
  metricsPlotExpanded: false,
  metricsPlotHoveredPoint: -1,
  metricsPlotVisibleMetrics: ['linesOfCode', 'totalFiles', 'commitCount'],
  metricsPlotCalendarData: null,
  metricsPlotChartDimensions: {
    width: 1200,
    height: 180,
    visibleWidth: 1200,
    needsScrolling: false,
    dayWidth: 0,
    visibleDays: 0
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setAnimationSpeed: (state, action: PayloadAction<number>) => {
      state.animationSpeed = action.payload;
    },
    setAutoDrift: (state, action: PayloadAction<boolean>) => {
      state.autoDrift = action.payload;
    },
    setDroneMode: (state, action: PayloadAction<boolean>) => {
      state.droneMode = action.payload;
    },
    setIsAutoScrolling: (state, action: PayloadAction<boolean>) => {
      state.isAutoScrolling = action.payload;
    },
    setViewAll: (state, action: PayloadAction<boolean>) => {
      state.viewAll = action.payload;
    },
    setFocusCurrentMode: (state, action: PayloadAction<boolean>) => {
      state.focusCurrentMode = action.payload;
    },
    setDebugMode: (state, action: PayloadAction<boolean>) => {
      state.debugMode = action.payload;
    },
    setCameraCyclingMode: (state, action: PayloadAction<boolean>) => {
      state.cameraCyclingMode = action.payload;
    },
    updateCameraState: (state, action: PayloadAction<Partial<CameraState>>) => {
      state.cameraState = { ...state.cameraState, ...action.payload };
    },
    setCameraState: (state, action: PayloadAction<CameraState>) => {
      state.cameraState = action.payload;
    },
    setSelectedCardId: (state, action: PayloadAction<string | null>) => {
      state.selectedCardId = action.payload;
    },
    setHoveredCardId: (state, action: PayloadAction<string | null>) => {
      state.hoveredCardId = action.payload;
    },
    setShowThinnedCards: (state, action: PayloadAction<boolean>) => {
      state.showThinnedCards = action.payload;
    },
    setMarkerFadeOpacity: (state, action: PayloadAction<number>) => {
      state.markerFadeOpacity = action.payload;
    },
    setDebugMarkerFade: (state, action: PayloadAction<boolean>) => {
      state.debugMarkerFade = action.payload;
    },
    setFadedCardsTemporalRange: (state, action: PayloadAction<{ minTimestamp: number; maxTimestamp: number } | null>) => {
      state.fadedCardsTemporalRange = action.payload;
    },
    setShowPreferences: (state, action: PayloadAction<boolean>) => {
      state.showPreferences = action.payload;
    },
    setShowLoggingControl: (state, action: PayloadAction<boolean>) => {
      state.showLoggingControl = action.payload;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setIsInitializing: (state, action: PayloadAction<boolean>) => {
      state.isInitializing = action.payload;
    },
    setIsReloadingSoft: (state, action: PayloadAction<boolean>) => {
      state.isReloadingSoft = action.payload;
    },
    setIsReloadingHard: (state, action: PayloadAction<boolean>) => {
      state.isReloadingHard = action.payload;
    },
    setPerformanceProfilingEnabled: (state, action: PayloadAction<boolean>) => {
      state.performanceProfilingEnabled = action.payload;
    },
    setVisibleEventsCount: (state, action: PayloadAction<number>) => {
      state.visibleEventsCount = action.payload;
    },
    setIsViewportThinning: (state, action: PayloadAction<boolean>) => {
      state.isViewportThinning = action.payload;
    },
    setIsMarkerDragging: (state, action: PayloadAction<boolean>) => {
      state.isMarkerDragging = action.payload;
    },
    setIsTimelineHovering: (state, action: PayloadAction<boolean>) => {
      state.isTimelineHovering = action.payload;
    },
    setGlobalError: (state, action: PayloadAction<string | null>) => {
      state.globalError = action.payload;
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload;
    },
    resetUI: (state) => {
      state.selectedCardId = null;
      state.hoveredCardId = null;
      state.showPreferences = false;
      state.showLoggingControl = false;
      state.viewAll = false;
      state.focusCurrentMode = false;
      state.isAutoScrolling = false;
      state.isMarkerDragging = false;
      state.isTimelineHovering = false;
      state.globalError = null;
      state.globalLoading = false;
    },
    setMetricsPlotExpanded: (state, action: PayloadAction<boolean>) => {
      state.metricsPlotExpanded = action.payload;
    },
    setMetricsPlotHoveredPoint: (state, action: PayloadAction<number>) => {
      state.metricsPlotHoveredPoint = action.payload;
    },
    setMetricsPlotVisibleMetrics: (state, action: PayloadAction<string[]>) => {
      state.metricsPlotVisibleMetrics = action.payload;
    },
    toggleMetricsPlotMetric: (state, action: PayloadAction<string>) => {
      const metric = action.payload;
      const currentMetrics = state.metricsPlotVisibleMetrics;
      if (currentMetrics.includes(metric)) {
        state.metricsPlotVisibleMetrics = currentMetrics.filter(m => m !== metric);
      } else {
        state.metricsPlotVisibleMetrics = [...currentMetrics, metric];
      }
    },
    setMetricsPlotCalendarData: (state, action: PayloadAction<UIState['metricsPlotCalendarData']>) => {
      state.metricsPlotCalendarData = action.payload;
    },
    setMetricsPlotChartDimensions: (state, action: PayloadAction<UIState['metricsPlotChartDimensions']>) => {
      state.metricsPlotChartDimensions = action.payload;
    },
  },
});

export const {
  setAnimationSpeed,
  setAutoDrift,
  setDroneMode,
  setIsAutoScrolling,
  setViewAll,
  setFocusCurrentMode,
  setDebugMode,
  setCameraCyclingMode,
  setPerformanceProfilingEnabled,
  updateCameraState,
  setCameraState,
  setSelectedCardId,
  setHoveredCardId,
  setShowThinnedCards,
  setMarkerFadeOpacity,
  setDebugMarkerFade,
  setFadedCardsTemporalRange,
  setShowPreferences,
  setShowLoggingControl,
  setSidebarOpen,
  setIsInitializing,
  setIsReloadingSoft,
  setIsReloadingHard,
  setVisibleEventsCount,
  setIsViewportThinning,
  setIsMarkerDragging,
  setIsTimelineHovering,
  setGlobalError,
  setGlobalLoading,
  resetUI,
  setMetricsPlotExpanded,
  setMetricsPlotHoveredPoint,
  setMetricsPlotVisibleMetrics,
  toggleMetricsPlotMetric,
  setMetricsPlotCalendarData,
  setMetricsPlotChartDimensions,
} = uiSlice.actions;

export default uiSlice.reducer;