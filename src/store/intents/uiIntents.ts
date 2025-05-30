import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import * as THREE from 'three';
import {
  setSelectedCardId,
  setHoveredCardId,
  updateCameraState,
  setViewAll,
  setIsAutoScrolling,
  setDroneMode,
  setFocusCurrentMode
} from '../slices/uiSlice';
import { setMarkerPosition } from '../slices/timelineSlice';
import { updateCameraPreferences, updateMarkerPositionPreferences } from './preferencesIntents';

// Intent to select a card and update camera
export const selectCard = createAsyncThunk<
  void,
  { cardId: string | null; position?: { x: number; y: number; z: number } },
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
        target: { x: currentCamera.target.x, y: currentCamera.target.y, z: position },
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
      // Disable other modes when viewing all
      dispatch(setFocusCurrentMode(false));
      dispatch(setDroneMode(false));
      dispatch(setIsAutoScrolling(false));

      // Reset camera to overview position
      dispatch(updateCameraState({
        position: { x: 0, y: 50, z: 0 },
        target: { x: 0, y: 0, z: 0 },
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

// Intent to focus on current marker position
export const focusOnCurrentPosition = createAsyncThunk<
  void,
  void,
  { state: RootState }
>(
  'ui/focusOnCurrentPosition',
  async (_, { dispatch, getState }) => {
    const state = getState();
    const currentPosition = state.timeline.markerPosition;

    // First, disable conflicting modes
    dispatch(setViewAll(false));
    dispatch(setDroneMode(false));
    dispatch(setIsAutoScrolling(false));

    // Update camera target to current marker position first
    dispatch(updateCameraState({
      target: { x: 0, y: 0, z: currentPosition },
    }));

    // Then enable focus current mode (this will trigger the camera to focus)
    dispatch(setFocusCurrentMode(true));
  }
);

// Intent to update camera state with preferences sync
export const updateCameraWithSync = createAsyncThunk<
  void,
  { position?: { x: number; y: number; z: number }; target?: { x: number; y: number; z: number }; zoom?: number },
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

    // Sync with preferences (throttled) - convert to Vector3 for preferences
    dispatch(updateCameraPreferences({
      position: new THREE.Vector3(newPosition.x, newPosition.y, newPosition.z),
      target: new THREE.Vector3(newTarget.x, newTarget.y, newTarget.z),
      zoom: newZoom,
    }));
  }
);

// Intent to reset timeline marker to beginning
export const resetTimelineToStart = createAsyncThunk<
  void,
  void,
  { state: RootState }
>(
  'ui/resetTimelineToStart',
  async (_, { dispatch, getState }) => {
    const state = getState();
    const events = state.timeline.events;
    
    // Find the earliest position (first event or 0)
    let startPosition = 0;
    if (events.length > 0) {
      // Calculate the start position based on the capped timeline length
      const minSpacing = 5;
      const maxTimelineLength = 500; // Must match TimelineEvents.tsx
      const timelineLength = Math.min(
        Math.max(events.length * minSpacing, 100),
        maxTimelineLength
      );
      startPosition = -timelineLength / 2;
    }

    // Disable conflicting modes
    dispatch(setViewAll(false));
    dispatch(setDroneMode(false));
    dispatch(setFocusCurrentMode(false));
    dispatch(setIsAutoScrolling(false));

    // Update timeline position and camera
    dispatch(updateTimelinePosition({ position: startPosition, updateCamera: true }));
  }
);