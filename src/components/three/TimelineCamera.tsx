import { useEffect, useState, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3, PerspectiveCamera, OrthographicCamera } from 'three';
import { useLogger } from '../../utils/logging/hooks/useLogger';
import type { TimelineEvent } from '../../data/types/TimelineEvent';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

// Define camera states interface
export interface CameraState {
  position: Vector3;
  target: Vector3;
  zoom: number;
}

interface TimelineCameraProps {
  target: Vector3;
  viewAllMode?: boolean;
  focusCurrentMode?: boolean;
  events?: TimelineEvent[]; // For calculating the bounds of all events
  debugMode?: boolean; // Enable camera position cycling for debugging
  onCameraPositionChange?: (position: Vector3) => void; // Callback for camera position changes
  onCameraStateChange?: (state: CameraState) => void; // Callback for full camera state changes
  initialCameraState?: CameraState; // Initial camera state to restore
  disableControls?: boolean; // Disable camera controls temporarily (e.g., during marker dragging)
}

// Calculate a position that shows the timeline from above-left with timeline stretching from top-left to bottom-right
const calculateViewAllPosition = (_target: Vector3, events: TimelineEvent[] = []): Vector3 => {
  // If we have events, calculate a position that shows all of them
  if (events && events.length > 0) {
    // Estimate the length of the timeline based on number of events
    // Assuming events are spaced by ~5 units as in TimelineEvents.tsx
    const spacing = 5;
    const timelineLength = Math.max(events.length * spacing, 100);

    // Calculate distance based on timeline length
    // The longer the timeline, the further back we need to be
    const distance = Math.max(60, timelineLength * 0.9);

    // Position camera at an angle to see the timeline from above
    // This will show the timeline stretching from top left to bottom right
    // with cards facing into the camera
    return new Vector3(
      -distance * 0.8,        // Position to the left
      distance * 1.0,         // Position higher above for a more top-down view
      -timelineLength * 0.5   // Position toward the start of the timeline
    );
  }

  // Fallback for when we don't have events or can't calculate bounds
  return new Vector3(
    -35, // Position further to the left
    30,  // Position higher above for a more top-down view
    -50  // Position further toward the start of the timeline
  );
};

// Calculate a position that focuses on the current time point
const calculateFocusPosition = (target: Vector3): Vector3 => {
  // Position camera to look along the time axis diagonally - closer to axis, lower height
  // Position in front of the marker so we can see the cards from their front
  const distance = 15; // Closer distance to the axis

  return new Vector3(
    -distance * 0.4,  // Closer to the axis (less side offset)
    distance * 0.4,   // Lower height - closer to the timeline level
    target.z + 8      // Position in front of the target to see cards from front
  );
};

// --- Zoom factor logic for PerspectiveCamera ---
const DEFAULT_CAMERA_DISTANCE = 84.24; // Set this to your initial camera-to-target distance (from debug logs)

function getCameraDistance(position: Vector3, target: Vector3) {
  return position.distanceTo(target);
}

function getZoomFactor(position: Vector3, target: Vector3) {
  // For PerspectiveCamera: zoom = defaultDistance / currentDistance
  return DEFAULT_CAMERA_DISTANCE / getCameraDistance(position, target);
}

function getPositionForZoom(target: Vector3, direction: Vector3, zoom: number) {
  // For PerspectiveCamera: place camera at distance = defaultDistance / zoom from target, along direction
  const distance = DEFAULT_CAMERA_DISTANCE / zoom;
  return target.clone().add(direction.clone().setLength(distance));
}

// Debug camera positions for cycling
const DEBUG_CAMERA_POSITIONS = [
  { position: new Vector3(-35, 30, -50), target: new Vector3(0, 0, 0) },
  { position: new Vector3(-20, 40, -30), target: new Vector3(0, 0, 0) },
  { position: new Vector3(-50, 20, -70), target: new Vector3(0, 0, 0) },
  { position: new Vector3(-30, 50, -40), target: new Vector3(0, 0, 0) },
];

export const TimelineCamera: React.FC<TimelineCameraProps> = ({
  target,
  viewAllMode = false,
  focusCurrentMode = false,
  events = [],
  debugMode = false,
  onCameraPositionChange,
  onCameraStateChange,
  initialCameraState,
  disableControls = false,
}) => {
  const { camera } = useThree();
  const logger = useLogger({ component: 'TimelineCamera', topic: 'ui' });
  const orbitControlsRef = useRef<OrbitControlsImpl>(null);

  // Create a single source of truth for camera state
  const [cameraState, setCameraState] = useState<CameraState>(() => {
    // Initialize with initialCameraState if provided, otherwise use default
    if (initialCameraState) {
      // Create a new state object with pristine Vector3 instances
      return {
        position: new Vector3(
          Number(initialCameraState.position.x),
          Number(initialCameraState.position.y),
          Number(initialCameraState.position.z)
        ),
        target: new Vector3(
          Number(initialCameraState.target.x),
          Number(initialCameraState.target.y),
          Number(initialCameraState.target.z)
        ),
        zoom: Number(initialCameraState.zoom)
      };
    }

    // Default initial state
    return {
      position: new Vector3(-35, 30, -50),
      target: target.clone() || new Vector3(0, 0, 0),
      zoom: 1.0
    };
  });

  // Add a dedicated zoom tracking state to ensure we capture it correctly
  const [currentZoom, setCurrentZoom] = useState(initialCameraState?.zoom || 1.0);

  // Track when initialization is complete
  const [initialized, setInitialized] = useState(false);

  // Track the source of state changes to prevent loops
  const stateChangeSourceRef = useRef<'init' | 'controls' | 'mode' | 'frame' | null>(null);

  // Track user interaction
  const userInteractingRef = useRef(false);

  // Add debug cycling state
  const debugCycleTimer = useRef<number | null>(null);

  // Expose camera details to help debugging
  useEffect(() => {
    console.log('[DEBUG] Camera object details:', {
      type: camera.type,
      isPerspective: camera instanceof PerspectiveCamera,
      isOrthographic: camera instanceof OrthographicCamera,
      initialZoom: camera.zoom,
      fov: 'fov' in camera ? camera.fov : 'N/A'
    });
  }, [camera]);

  // Helper to update camera state in a single place
  const updateCameraState = (
    newState: CameraState,
    source: 'init' | 'controls' | 'mode' | 'frame'
  ) => {
    if (!initialized && source !== 'init') return;

    let zoom = newState.zoom;
    if (camera instanceof PerspectiveCamera) {
      zoom = getZoomFactor(newState.position, newState.target);
    } else if (camera instanceof OrthographicCamera) {
      zoom = camera.zoom;
    }

    const updatedState: CameraState = {
      ...newState,
      zoom,
    };

    // Skip redundant updates (no actual change)
    const positionEqual = updatedState.position.distanceTo(cameraState.position) < 0.1;
    const targetEqual = updatedState.target.distanceTo(cameraState.target) < 0.1;
    const zoomEqual = Math.abs(updatedState.zoom - cameraState.zoom) < 0.05;

    if (positionEqual && targetEqual && zoomEqual) {
      return;
    }

    // Create a fresh state object with direct values to ensure clean state
    const cleanState: CameraState = {
      position: new Vector3(
        Number(updatedState.position.x),
        Number(updatedState.position.y),
        Number(updatedState.position.z)
      ),
      target: new Vector3(
        Number(updatedState.target.x),
        Number(updatedState.target.y),
        Number(updatedState.target.z)
      ),
      zoom: Number(updatedState.zoom)
    };

    // Update local state
    setCameraState(cleanState);

    // Mark the source of this state change
    stateChangeSourceRef.current = source;

    // Notify parent components
    if (onCameraStateChange) {
      // Only log in debug mode to reduce console spam
      if (debugMode) {
        console.log('[TimelineCamera] Sending state to parent:', {
          id: Date.now(),
          source,
          position: {
            x: cleanState.position.x.toFixed(2),
            y: cleanState.position.y.toFixed(2),
            z: cleanState.position.z.toFixed(2)
          },
          target: {
            x: cleanState.target.x.toFixed(2),
            y: cleanState.target.y.toFixed(2),
            z: cleanState.target.z.toFixed(2)
          },
          zoom: cleanState.zoom.toFixed(2)
        });
      }
      onCameraStateChange(cleanState);
    }

    if (onCameraPositionChange) {
      onCameraPositionChange(cleanState.position);
    }

    if (debugMode) {
      console.log(`Camera state updated from ${source}:`, {
        position: {
          x: cleanState.position.x.toFixed(1),
          y: cleanState.position.y.toFixed(1),
          z: cleanState.position.z.toFixed(1)
        },
        target: {
          x: cleanState.target.x.toFixed(1),
          y: cleanState.target.y.toFixed(1),
          z: cleanState.target.z.toFixed(1)
        },
        zoom: cleanState.zoom.toFixed(1)
      });
    }
  };

  // Apply camera state to Three.js camera and controls
  const applyCameraState = (state: CameraState) => {
    if (camera instanceof PerspectiveCamera) {
      // Move camera along its current direction to match the zoom factor
      const direction = state.position.clone().sub(state.target).normalize();
      const newPosition = getPositionForZoom(state.target, direction, state.zoom);
      camera.position.copy(newPosition);
    } else if (camera instanceof OrthographicCamera) {
      camera.position.copy(state.position);
      camera.zoom = state.zoom;
      camera.updateProjectionMatrix();
    }
    if (orbitControlsRef.current) {
      orbitControlsRef.current.target.copy(state.target);
      orbitControlsRef.current.update();
    }
    setCurrentZoom(state.zoom);

    // Add detailed camera information logging
    console.log(`[DEBUG] Camera details after applying state:`, {
      type: camera.type,
      zoom: camera.zoom,
      stateZoom: state.zoom,
      trackingZoom: currentZoom,
      distanceToTarget: camera.position.distanceTo(
        orbitControlsRef.current?.target || new Vector3()
      )
    });

    // Only log in debug mode to reduce console spam
    if (debugMode) {
      console.log(`[TimelineCamera] Applied state to camera:`, {
        position: {
          x: state.position.x.toFixed(2),
          y: state.position.y.toFixed(2),
          z: state.position.z.toFixed(2)
        },
        target: {
          x: state.target.x.toFixed(2),
          y: state.target.y.toFixed(2),
          z: state.target.z.toFixed(2)
        },
        zoom: state.zoom.toFixed(2),
        cameraDotZoom: camera.zoom.toFixed(2)
      });
    }
  };

  // Initial setup - Apply initial camera state once
  useEffect(() => {
    if (initialized) return;

    // Apply the initial state to the camera
    applyCameraState(cameraState);

    // Mark as initialized
    setInitialized(true);

    logger.info('Initial camera state applied', {
      position: {
        x: cameraState.position.x,
        y: cameraState.position.y,
        z: cameraState.position.z
      },
      target: {
        x: cameraState.target.x,
        y: cameraState.target.y,
        z: cameraState.target.z
      },
      zoom: cameraState.zoom
    });
  }, [cameraState, initialized]);

  // Update camera when cameraState changes (only after initialization)
  useEffect(() => {
    if (!initialized) return;

    // Apply the state
    applyCameraState(cameraState);

  }, [cameraState, initialized]);

  // Handle view mode changes (viewAllMode or focusCurrentMode)
  useEffect(() => {
    if (!initialized) return;

    // Skip if user is currently interacting
    if (userInteractingRef.current) return;

    if (viewAllMode) {
      // View all events
      const newPosition = calculateViewAllPosition(target, events);

      updateCameraState({
        position: newPosition,
        target: target.clone(),
        zoom: camera.zoom
      }, 'mode');

      logger.info('Setting camera to view all mode', {
        position: { x: newPosition.x, y: newPosition.y, z: newPosition.z },
        target: { x: target.x, y: target.y, z: target.z }
      });
    }
    else if (focusCurrentMode) {
      // Focus on current time point with 4x zoom
      const desiredZoom = 4.0;

      // Get the direction from the basic focus position
      const basicFocusPosition = calculateFocusPosition(target);
      const direction = basicFocusPosition.clone().sub(target).normalize();

      // Calculate the position that will give us exactly 4x zoom
      const newPosition = getPositionForZoom(target, direction, desiredZoom);

      updateCameraState({
        position: newPosition,
        target: target.clone(),
        zoom: desiredZoom // This will be recalculated but should match
      }, 'mode');

      logger.info('Setting camera to focus mode', {
        position: { x: newPosition.x, y: newPosition.y, z: newPosition.z },
        target: { x: target.x, y: target.y, z: target.z },
        desiredZoom,
        calculatedDistance: newPosition.distanceTo(target)
      });
    }
  }, [viewAllMode, focusCurrentMode, target, initialized, events]);

  // Update when target changes (for timeline movement)
  useEffect(() => {
    if (!initialized) return;

    // Skip if user is currently interacting with camera controls (but not if controls are disabled)
    // This allows marker dragging to update the camera state even when controls are disabled
    if (userInteractingRef.current && !disableControls) return;

    // Skip if in specific view modes
    if (viewAllMode || focusCurrentMode) return;

    // Only update the target component of the state
    updateCameraState({
      ...cameraState,
      target: target.clone()
    }, 'frame');

  }, [target, initialized, disableControls, viewAllMode, focusCurrentMode]);

  // Monitor camera changes from OrbitControls using useFrame
  useFrame(() => {
    if (!initialized || userInteractingRef.current) return;
    if (stateChangeSourceRef.current === 'controls') {
      stateChangeSourceRef.current = null;
      return;
    }
    const currentPosition = new Vector3(
      camera.position.x,
      camera.position.y,
      camera.position.z
    );
    const currentTarget = orbitControlsRef.current ? new Vector3(
      orbitControlsRef.current.target.x,
      orbitControlsRef.current.target.y,
      orbitControlsRef.current.target.z
    ) : new Vector3(0, 0, 0);
    let currentZoom = camera.zoom;
    if (camera instanceof PerspectiveCamera) {
      currentZoom = getZoomFactor(currentPosition, currentTarget);
    }
    // // Every ~5 seconds, log the camera state regardless of changes
    // if (Date.now() % 5000 < 20) {
    //   console.log(`[DEBUG] Periodic camera check:`, {
    //     type: camera.type,
    //     zoom: camera.zoom,
    //     position: {
    //       x: currentPosition.x.toFixed(2),
    //       y: currentPosition.y.toFixed(2),
    //       z: currentPosition.z.toFixed(2)
    //     },
    //     stateZoom: cameraState.zoom.toFixed(4),
    //     currentZoom: currentZoom.toFixed(4),
    //     zoomDifference: Math.abs(currentZoom - cameraState.zoom).toFixed(4),
    //     distanceToTarget: currentPosition.distanceTo(currentTarget).toFixed(2)
    //   });
    // }

    // Detect changes - even more sensitive thresholds
    const positionChanged = currentPosition.distanceTo(cameraState.position) > 0.1;
    const targetChanged = currentTarget.distanceTo(cameraState.target) > 0.05;
    const zoomChanged = Math.abs(currentZoom - cameraState.zoom) > 0.001; // Ultra sensitive

    // Only update state if actual changes detected
    if (positionChanged || targetChanged || zoomChanged) {
      // Create new state object with fresh values
      const newState: CameraState = {
        position: new Vector3(
          currentPosition.x,
          currentPosition.y,
          currentPosition.z
        ),
        target: new Vector3(
          currentTarget.x,
          currentTarget.y,
          currentTarget.z
        ),
        zoom: currentZoom
      };

      // Log when zoom changes to debug
      if (zoomChanged) {
        console.log(`[TimelineCamera] Zoom changed:`, {
          old: cameraState.zoom.toFixed(4),
          new: currentZoom.toFixed(4),
          diff: (currentZoom - cameraState.zoom).toFixed(4)
        });
      }

      updateCameraState(newState, 'frame');
    }
  });

  // Debug camera cycling effect
  useEffect(() => {
    if (debugMode && !userInteractingRef.current) {
      // Start cycling through debug positions
      debugCycleTimer.current = window.setInterval(() => {
        const currentIndex = DEBUG_CAMERA_POSITIONS.findIndex(
          pos => pos.position.distanceTo(camera.position) < 0.1
        );
        const nextIndex = (currentIndex + 1) % DEBUG_CAMERA_POSITIONS.length;
        const debugPos = DEBUG_CAMERA_POSITIONS[nextIndex];

        updateCameraState({
          position: debugPos.position.clone(),
          target: debugPos.target.clone(),
          zoom: camera.zoom
        }, 'mode');
      }, 2000); // Cycle every 2 seconds
    } else {
      // Clear cycling timer when debug mode is disabled
      if (debugCycleTimer.current) {
        window.clearInterval(debugCycleTimer.current);
      }
    }

    // Cleanup on unmount
    return () => {
      if (debugCycleTimer.current) {
        window.clearInterval(debugCycleTimer.current);
      }
    };
  }, [debugMode, camera]);

  return (
    <OrbitControls
      ref={orbitControlsRef}
      makeDefault
      target={cameraState.target}
      enablePan={!debugMode && !disableControls}
      enableZoom={!disableControls}
      enableRotate={!debugMode && !disableControls}
      minDistance={5}
      maxDistance={150}
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      maxAzimuthAngle={Infinity}
      minAzimuthAngle={-Infinity}
      enableDamping={true}
      dampingFactor={0.3}
      rotateSpeed={0.8}
      zoomSpeed={1.0}
      panSpeed={0.8}
      autoRotate={false}
      onStart={() => {
        userInteractingRef.current = true;

        if (debugMode) {
          console.log('User interaction started with OrbitControls');
        }
      }}
      onChange={() => {
        if (!userInteractingRef.current) return;
        const currentPosition = new Vector3(
          camera.position.x,
          camera.position.y,
          camera.position.z
        );
        const currentTarget = orbitControlsRef.current ? new Vector3(
          orbitControlsRef.current.target.x,
          orbitControlsRef.current.target.y,
          orbitControlsRef.current.target.z
        ) : new Vector3(0, 0, 0);
        let cameraZoom = camera.zoom;
        if (camera instanceof PerspectiveCamera) {
          cameraZoom = getZoomFactor(currentPosition, currentTarget);
        }
        setCurrentZoom(cameraZoom);
        // ... rest unchanged ...
        if (Math.abs(cameraZoom - cameraState.zoom) > 0.001) {
          // ...
          const newState: CameraState = {
            position: currentPosition,
            target: currentTarget,
            zoom: cameraZoom
          };
          updateCameraState(newState, 'controls');
          return;
        }
        if (Date.now() % 5 === 0) {
          const newState: CameraState = {
            position: currentPosition,
            target: currentTarget,
            zoom: cameraZoom
          };
          updateCameraState(newState, 'controls');
        }
      }}
      onEnd={() => {
        const currentPosition = new Vector3(
          camera.position.x,
          camera.position.y,
          camera.position.z
        );
        const currentTarget = orbitControlsRef.current ? new Vector3(
          orbitControlsRef.current.target.x,
          orbitControlsRef.current.target.y,
          orbitControlsRef.current.target.z
        ) : new Vector3(0, 0, 0);
        let cameraZoom = camera.zoom;
        if (camera instanceof PerspectiveCamera) {
          cameraZoom = getZoomFactor(currentPosition, currentTarget);
        }
        setCurrentZoom(cameraZoom);
        // ...
        const finalState: CameraState = {
          position: currentPosition,
          target: currentTarget,
          zoom: cameraZoom
        };
        updateCameraState(finalState, 'controls');
        userInteractingRef.current = false;
        if (debugMode) {
          console.log('User interaction ended with OrbitControls');
        }
      }}
    />
  );
};
