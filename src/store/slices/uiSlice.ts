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

  // Camera state
  cameraState: CameraState;

  // Card states
  selectedCardId: string | null;
  hoveredCardId: string | null;

  // Modal states
  showPreferences: boolean;
  showLoggingControl: boolean;

  // Layout states
  sidebarOpen: boolean;

  // Loading states
  isInitializing: boolean;
}

const initialState: UIState = {
  animationSpeed: 1.0,
  autoDrift: false,
  droneMode: false,
  isAutoScrolling: false,
  viewAll: false,
  focusCurrentMode: false,
  debugMode: false,
  cameraState: {
    position: { x: 0, y: 20, z: 50 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 1,
  },
  selectedCardId: null,
  hoveredCardId: null,
  showPreferences: false,
  showLoggingControl: false,
  sidebarOpen: false,
  isInitializing: true,
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
    resetUI: (state) => {
      state.selectedCardId = null;
      state.hoveredCardId = null;
      state.showPreferences = false;
      state.showLoggingControl = false;
      state.viewAll = false;
      state.focusCurrentMode = false;
      state.isAutoScrolling = false;
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
  updateCameraState,
  setCameraState,
  setSelectedCardId,
  setHoveredCardId,
  setShowPreferences,
  setShowLoggingControl,
  setSidebarOpen,
  setIsInitializing,
  resetUI,
} = uiSlice.actions;

export default uiSlice.reducer;