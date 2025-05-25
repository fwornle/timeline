import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { Preferences, StoredCameraState } from '../../services/storage';
import * as THREE from 'three';
import { updatePreferences } from '../slices/preferencesSlice';
import { updateCameraState } from '../slices/uiSlice';

// Intent to update camera state in preferences
export const updateCameraPreferences = createAsyncThunk<
  void,
  { position: THREE.Vector3; target: THREE.Vector3; zoom: number },
  { state: RootState }
>(
  'preferences/updateCamera',
  async ({ position, target, zoom }, { dispatch }) => {
    const cameraState: StoredCameraState = {
      position: { x: position.x, y: position.y, z: position.z },
      target: { x: target.x, y: target.y, z: target.z },
      zoom,
    };
    
    dispatch(updatePreferences({ cameraState }));
    dispatch(updateCameraState({ position, target, zoom }));
  }
);

// Intent to update animation preferences
export const updateAnimationPreferences = createAsyncThunk<
  void,
  { speed?: number; autoDrift?: boolean },
  { state: RootState }
>(
  'preferences/updateAnimation',
  async (settings, { dispatch }) => {
    const preferences: Partial<Preferences> = {};
    
    if (settings.speed !== undefined) {
      preferences.animationSpeed = settings.speed;
    }
    
    if (settings.autoDrift !== undefined) {
      preferences.autoDrift = settings.autoDrift;
    }
    
    dispatch(updatePreferences(preferences));
  }
);

// Intent to update repository preferences
export const updateRepositoryPreferences = createAsyncThunk<
  void,
  { repoUrl?: string; username?: string },
  { state: RootState }
>(
  'preferences/updateRepository',
  async (settings, { dispatch }) => {
    const preferences: Partial<Preferences> = {};
    
    if (settings.repoUrl !== undefined) {
      preferences.repoUrl = settings.repoUrl;
    }
    
    if (settings.username !== undefined) {
      preferences.username = settings.username;
    }
    
    dispatch(updatePreferences(preferences));
  }
);

// Intent to update marker position in preferences
export const updateMarkerPositionPreferences = createAsyncThunk<
  void,
  number,
  { state: RootState }
>(
  'preferences/updateMarkerPosition',
  async (markerPosition, { dispatch }) => {
    dispatch(updatePreferences({ markerPosition }));
  }
);