import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../index';
import { setPreferences } from '../slices/preferencesSlice';
import { loadPreferences } from '../../services/storage';
import { updateCameraState, setAnimationSpeed, setAutoDrift } from '../slices/uiSlice';
import * as THREE from 'three';

export function usePreferencesMigration() {
  const dispatch = useAppDispatch();
  const isLoaded = useAppSelector(state => state.preferences.isLoaded);
  const preferences = useAppSelector(state => state.preferences);

  useEffect(() => {
    if (!isLoaded) return;

    // Sync UI state from preferences
    if (preferences.animationSpeed !== undefined) {
      dispatch(setAnimationSpeed(preferences.animationSpeed));
    }

    if (preferences.autoDrift !== undefined) {
      dispatch(setAutoDrift(preferences.autoDrift));
    }

    if (preferences.cameraState) {
      const { position, target, zoom } = preferences.cameraState;
      dispatch(updateCameraState({
        position: new THREE.Vector3(position.x, position.y, position.z),
        target: new THREE.Vector3(target.x, target.y, target.z),
        zoom,
      }));
    }
  }, [dispatch, isLoaded, preferences]);

  // Return a compatibility API similar to the old context
  return {
    preferences,
    setPreferences: (prefs: typeof preferences) => dispatch(setPreferences(prefs)),
    refreshPreferences: () => {
      const loaded = loadPreferences();
      dispatch(setPreferences(loaded));
    },
  };
}