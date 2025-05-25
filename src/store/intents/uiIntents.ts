import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import * as THREE from 'three';
import { 
  setSelectedCardId, 
  setHoveredCardId, 
  updateCameraState,
  setViewAll,
  setIsAutoScrolling,
  setDroneMode 
} from '../slices/uiSlice';
import { setMarkerPosition } from '../slices/timelineSlice';
import { updateCameraPreferences, updateMarkerPositionPreferences } from './preferencesIntents';

// Intent to select a card and update camera
export const selectCard = createAsyncThunk<
  void,
  { cardId: string | null; position?: THREE.Vector3 },
  { state: RootState }
>(
  'ui/selectCard',
  async ({ cardId, position }, { dispatch }) => {
    dispatch(setSelectedCardId(cardId));
    
    if (position) {
      dispatch(updateCameraState({
        target: position,
      }));
    }
  }
);

// Intent to hover over a card
export const hoverCard = createAsyncThunk<
  void,
  string | null,
  { state: RootState }
>(
  'ui/hoverCard',
  async (cardId, { dispatch }) => {
    dispatch(setHoveredCardId(cardId));
  }
);

// Intent to update timeline position with camera sync
export const updateTimelinePosition = createAsyncThunk<
  void,
  { position: number; updateCamera?: boolean },
  { state: RootState }
>(
  'ui/updateTimelinePosition',
  async ({ position, updateCamera = true }, { dispatch, getState }) => {
    dispatch(setMarkerPosition(position));
    
    if (updateCamera) {
      const state = getState();
      const currentCamera = state.ui.cameraState;
      
      // Update camera target z position to follow timeline
      dispatch(updateCameraState({
        target: new THREE.Vector3(currentCamera.target.x, currentCamera.target.y, position),
      }));
    }
    
    // Throttled update to preferences
    dispatch(updateMarkerPositionPreferences(position));
  }
);

// Intent to toggle view all mode
export const toggleViewAll = createAsyncThunk<
  void,
  void,
  { state: RootState }
>(
  'ui/toggleViewAll',
  async (_, { dispatch, getState }) => {
    const state = getState();
    const newViewAll = !state.ui.viewAll;
    
    dispatch(setViewAll(newViewAll));
    
    if (newViewAll) {
      // Stop auto scrolling when viewing all
      dispatch(setIsAutoScrolling(false));
      
      // Reset camera to overview position
      dispatch(updateCameraState({
        position: new THREE.Vector3(0, 50, 0),
        target: new THREE.Vector3(0, 0, 0),
        zoom: 0.5,
      }));
    }
  }
);

// Intent to toggle drone mode
export const toggleDroneMode = createAsyncThunk<
  void,
  void,
  { state: RootState }
>(
  'ui/toggleDroneMode',
  async (_, { dispatch, getState }) => {
    const state = getState();
    const newDroneMode = !state.ui.droneMode;
    
    dispatch(setDroneMode(newDroneMode));
    
    if (newDroneMode) {
      // Enable auto scrolling for drone mode
      dispatch(setIsAutoScrolling(true));
    }
  }
);

// Intent to update camera state with preferences sync
export const updateCameraWithSync = createAsyncThunk<
  void,
  { position?: THREE.Vector3; target?: THREE.Vector3; zoom?: number },
  { state: RootState }
>(
  'ui/updateCameraWithSync',
  async (cameraUpdate, { dispatch, getState }) => {
    const state = getState();
    const currentCamera = state.ui.cameraState;
    
    const newPosition = cameraUpdate.position || currentCamera.position;
    const newTarget = cameraUpdate.target || currentCamera.target;
    const newZoom = cameraUpdate.zoom !== undefined ? cameraUpdate.zoom : currentCamera.zoom;
    
    dispatch(updateCameraState({
      position: newPosition,
      target: newTarget,
      zoom: newZoom,
    }));
    
    // Sync with preferences (throttled)
    dispatch(updateCameraPreferences({
      position: newPosition,
      target: newTarget,
      zoom: newZoom,
    }));
  }
);