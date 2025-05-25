import { useEffect, useRef, useCallback } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3, PerspectiveCamera, OrthographicCamera } from 'three';
import { useLogger } from '../../utils/logging/hooks/useLogger';
import { useAppDispatch, useAppSelector } from '../../store';
import type { TimelineEvent } from '../../data/types/TimelineEvent';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { updateCameraWithSync } from '../../store/intents/uiIntents';


// Define camera states interface - using Vector3 for Three.js operations
export interface CameraState {
  position: Vector3;
  target: Vector3;
  zoom: number;
}

// Helper functions to convert between Redux plain objects and Three.js Vector3
const toVector3 = (obj: { x: number; y: number; z: number }): Vector3 => {
  return new Vector3(obj.x, obj.y, obj.z);
};

const toPlainObject = (vec: Vector3): { x: number; y: number; z: number } => {
  return { x: vec.x, y: vec.y, z: vec.z };
};

interface TimelineCameraProps {
  target: Vector3;
  events?: TimelineEvent[]; // For calculating the bounds of all events
  onCameraPositionChange?: (position: Vector3) => void; // Callback for camera position changes
  onCameraStateChange?: (state: CameraState) => void; // Callback for full camera state changes
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

// Debug camera positions for cycling (DISABLED - kept for future reference)
// const DEBUG_CAMERA_POSITIONS = [
//   { position: new Vector3(-35, 30, -50), target: new Vector3(0, 0, 0) },
//   { position: new Vector3(-20, 40, -30), target: new Vector3(0, 0, 0) },
//   { position: new Vector3(-50, 20, -70), target: new Vector3(0, 0, 0) },
//   { position: new Vector3(-30, 50, -40), target: new Vector3(0, 0, 0) },
// ];

export const TimelineCamera: React.FC<TimelineCameraProps> = ({
  target,
  events = [],
  onCameraPositionChange,
  onCameraStateChange,
  disableControls = false,
}) => {
  const dispatch = useAppDispatch();

  // Get state from Redux store
  const {
    cameraState: reduxCameraState,
    viewAll: viewAllMode,
    focusCurrentMode,
    droneMode,
    debugMode,
  } = useAppSelector(state => state.ui);
  const { camera } = useThree();
  const logger = useLogger({ component: 'TimelineCamera', topic: 'ui' });
  const orbitControlsRef = useRef<OrbitControlsImpl>(null);

  // Add debouncing for camera updates
  const lastUpdateTimeRef = useRef<number>(0);
  const updateThrottleMs = 16; // ~60fps

  // Convert Redux camera state to Three.js Vector3 objects
  const cameraState: CameraState = {
    position: toVector3(reduxCameraState.position),
    target: toVector3(reduxCameraState.target),
    zoom: reduxCameraState.zoom,
  };

  // Add a dedicated zoom tracking state to ensure we capture it correctly
  const currentZoomRef = useRef(cameraState.zoom);

  // Track when initialization is complete
  const initializedRef = useRef(false);

  // Track the source of state changes to prevent loops
  const stateChangeSourceRef = useRef<'init' | 'controls' | 'mode' | 'frame' | null>(null);

  // Track user interaction
  const userInteractingRef = useRef(false);

  // Add debug cycling state
  const debugCycleTimer = useRef<number | null>(null);

  // Drone mode state for smooth random movement with free-flying around target
  const droneStateRef = useRef({
    offsetX: 0, // Will be initialized from current camera position
    offsetY: 0, // Will be initialized from current camera position
    offsetZ: 0, // Will be initialized from current camera position
    distance: 15, // Will be initialized from current camera position
    targetOffsetX: 0, // Will be set when drone mode starts
    targetOffsetY: 0, // Will be set when drone mode starts
    targetOffsetZ: 0, // Will be set when drone mode starts
    targetDistance: 15, // Will be set when drone mode starts
    lastUpdateTime: 0,
    changeInterval: 1500 + Math.random() * 3000, // Random initial interval
    userInterrupted: false, // Track if user moved camera manually
    userInterruptTime: 0, // When user last moved camera
    initialized: false, // Track if drone state has been initialized from current camera position
    homingPhase: true, // Start with homing phase to smoothly approach target area
    homingStartTime: 0, // When homing phase started
  });

  // Expose camera details to help debugging (only in debug mode)
  useEffect(() => {
    if (debugMode) {
      logger.debug('Camera object details:', {
        type: camera.type,
        isPerspective: camera instanceof PerspectiveCamera,
        isOrthographic: camera instanceof OrthographicCamera,
        initialZoom: camera.zoom,
        fov: 'fov' in camera ? camera.fov : 'N/A'
      });
    }
  }, [camera, debugMode, logger]);

  // Helper to update camera state through Redux
  const updateCameraState = useCallback((
    newState: CameraState,
    source: 'init' | 'controls' | 'mode' | 'frame',
    skipRedux: boolean = false
  ) => {
    if (!initializedRef.current && source !== 'init') return;

    // Prevent updates during state application to avoid circular loops
    if (isApplyingStateRef.current && source !== 'init') return;

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

    // Mark the source of this state change
    stateChangeSourceRef.current = source;

    // Update Redux state if not skipping
    if (!skipRedux) {
      dispatch(updateCameraWithSync({
        position: toPlainObject(cleanState.position),
        target: toPlainObject(cleanState.target),
        zoom: cleanState.zoom,
      }));
    }

    // Also notify parent components if callbacks exist
    if (onCameraStateChange) {
      if (debugMode) {
        logger.debug('Sending state to parent:', {
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
      logger.debug(`Camera state updated from ${source}:`, {
        skipRedux,
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
  }, [camera, cameraState, debugMode, logger, onCameraStateChange, onCameraPositionChange, dispatch]);

  // Apply camera state to Three.js camera and controls
  const applyCameraState = useCallback((state: CameraState) => {
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
    currentZoomRef.current = state.zoom;

    // Add detailed camera information logging (only in debug mode)
    if (debugMode) {
      logger.debug('Camera details after applying state:', {
        type: camera.type,
        zoom: camera.zoom,
        stateZoom: state.zoom,
        trackingZoom: currentZoomRef.current,
        distanceToTarget: camera.position.distanceTo(
          orbitControlsRef.current?.target || new Vector3()
        )
      });
    }

    // Only log in debug mode to reduce console spam
    if (debugMode) {
      logger.debug('Applied state to camera:', {
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
  }, [camera, debugMode, logger, currentZoomRef]);

  // Initial setup - Apply initial camera state once
  useEffect(() => {
    if (initializedRef.current) return;

    // Apply the initial state to the camera
    applyCameraState(cameraState);

    // Mark as initialized
    initializedRef.current = true;

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
  }, [applyCameraState, cameraState, logger]);

2  // Update camera when cameraState changes (only after initialization)
  // Use a ref to track the last applied state to prevent circular updates
  const lastAppliedStateRef = useRef<CameraState | null>(null);
  const isApplyingStateRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current || isApplyingStateRef.current) return;

    // Skip if this is the same state we just applied
    if (lastAppliedStateRef.current &&
        lastAppliedStateRef.current.position.distanceTo(cameraState.position) < 0.01 &&
        lastAppliedStateRef.current.target.distanceTo(cameraState.target) < 0.01 &&
        Math.abs(lastAppliedStateRef.current.zoom - cameraState.zoom) < 0.01) {
      return;
    }

    // Mark that we're applying state to prevent circular updates
    isApplyingStateRef.current = true;

    // Apply the state
    applyCameraState(cameraState);

    // Remember this state
    lastAppliedStateRef.current = {
      position: cameraState.position.clone(),
      target: cameraState.target.clone(),
      zoom: cameraState.zoom
    };

    // Reset the flag after a brief delay to allow the state to settle
    setTimeout(() => {
      isApplyingStateRef.current = false;
    }, 50);

  }, [cameraState, applyCameraState]); // Now safe to include memoized functions

  // Handle view mode changes (viewAllMode or focusCurrentMode)
  useEffect(() => {
    if (!initializedRef.current) return;

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

      // Auto-reset focus current mode after camera has moved
      setTimeout(() => {
        // Reset focus current mode through Redux
        if (onCameraStateChange) {
          // We need to signal to reset focus current mode
          // This will be handled by the parent component
          const resetEvent = new CustomEvent('resetFocusCurrentMode');
          window.dispatchEvent(resetEvent);
        }
      }, 200);
    }
  }, [viewAllMode, focusCurrentMode, target, events, updateCameraState, camera, logger]); // Now safe to include memoized functions

  // Update when target changes (for timeline movement)
  // Use a ref to track the last target to prevent circular updates
  const lastTargetRef = useRef<Vector3>(target.clone());

  // Track if we just exited drone mode to prevent drift mode from interfering
  const justExitedDroneModeRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) return;

    // Skip if user is currently interacting with camera controls (but not if controls are disabled)
    // This allows marker dragging to update the camera state even when controls are disabled
    if (userInteractingRef.current && !disableControls) return;

    // Skip if in specific view modes or drone mode
    if (viewAllMode || focusCurrentMode || droneMode) return;

    // Skip if we just exited drone mode to prevent camera jumping from drift mode
    if (justExitedDroneModeRef.current) {
      justExitedDroneModeRef.current = false;
      lastTargetRef.current = target.clone(); // Update reference to current target
      return;
    }

    // Check if target actually changed to prevent unnecessary updates
    const targetChanged = target.distanceTo(lastTargetRef.current) > 0.01;
    if (!targetChanged) return;

    // Calculate the target movement delta to maintain relative camera positioning
    const targetDelta = new Vector3().subVectors(target, lastTargetRef.current);

    // Update the last target reference
    lastTargetRef.current = target.clone();

    // Move both camera position and target by the same delta to maintain relative positioning
    // This prevents camera jumping during auto-drift
    if (orbitControlsRef.current && targetDelta.length() > 0.01) {
      const newCameraPosition = new Vector3().addVectors(camera.position, targetDelta);
      camera.position.copy(newCameraPosition);
      orbitControlsRef.current.target.copy(target);
      orbitControlsRef.current.update();

      // Update state to reflect the new positions
      updateCameraState({
        position: newCameraPosition,
        target: target,
        zoom: cameraState.zoom
      }, 'mode');
    }

  }, [target, disableControls, viewAllMode, focusCurrentMode, droneMode, updateCameraState, cameraState.zoom]); // Remove setCameraState dependency

  // Monitor camera changes from OrbitControls using useFrame
  useFrame(() => {
    if (!initializedRef.current || userInteractingRef.current) return;

    const now = performance.now();

    // Update camera target during animation (removed internalTargetRef dependency)
    // This is now handled by the target change effect instead

    // Handle drone mode - camera flies freely around marker like a bee
    if (droneMode && !viewAllMode && !focusCurrentMode) {
      const droneState = droneStateRef.current;

      // Initialize drone state from current camera position when first entering drone mode
      if (!droneState.initialized) {
        const currentPos = camera.position;
        const currentOffset = new Vector3().subVectors(currentPos, target);
        const currentDistance = currentOffset.length();

        // Initialize drone state from current camera position
        droneState.offsetX = currentOffset.x;
        droneState.offsetY = currentOffset.y;
        droneState.offsetZ = currentOffset.z;
        droneState.distance = currentDistance;

        // Set initial targets with more noticeable movement for immediate action
        droneState.targetOffsetX = droneState.offsetX + (Math.random() - 0.5) * 15; // Larger initial variation
        droneState.targetOffsetY = droneState.offsetY + (Math.random() - 0.5) * 10;
        droneState.targetOffsetZ = droneState.offsetZ + (Math.random() - 0.5) * 15;
        droneState.targetDistance = Math.max(8, Math.min(20, currentDistance + (Math.random() - 0.5) * 8));

        droneState.initialized = true;
        droneState.homingPhase = true;
        droneState.homingStartTime = now;
        droneState.lastUpdateTime = now - droneState.changeInterval; // Allow immediate target generation

        if (debugMode) {
          logger.debug('Initialized drone mode from current camera position', {
            currentPos: `(${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)}, ${currentPos.z.toFixed(1)})`,
            offsets: `X:${droneState.offsetX.toFixed(2)}, Y:${droneState.offsetY.toFixed(2)}, Z:${droneState.offsetZ.toFixed(2)}`,
            distance: droneState.distance.toFixed(2)
          });
        }
      }

      // Check if user is currently interacting with controls
      if (userInteractingRef.current && !droneState.userInterrupted) {
        droneState.userInterrupted = true;
        droneState.userInterruptTime = now;
        if (debugMode) {
          logger.debug('User interrupted drone mode - will resume from current position');
        }
      }

      // If user interrupted, wait for them to finish and then resume from current position
      if (droneState.userInterrupted) {
        if (userInteractingRef.current) {
          // User is still interacting, don't do anything - completely pause drone logic
          return;
        }

        const timeSinceInterrupt = now - droneState.userInterruptTime;
        if (timeSinceInterrupt > 200) { // After 0.2 second of no interaction, resume
          // Calculate current offsets from where user left the camera
          const currentPos = camera.position;
          const currentTarget = target;
          const currentOffset = new Vector3().subVectors(currentPos, currentTarget);
          const currentDistance = currentOffset.length();

          // Update drone state to current position - continue circling from here
          droneState.offsetX = currentOffset.x;
          droneState.offsetY = currentOffset.y;
          droneState.offsetZ = currentOffset.z;
          droneState.distance = currentDistance;

          // Set targets to exactly where we are now (no immediate movement)
          droneState.targetOffsetX = droneState.offsetX;
          droneState.targetOffsetY = droneState.offsetY;
          droneState.targetOffsetZ = droneState.offsetZ;
          droneState.targetDistance = currentDistance;

          droneState.userInterrupted = false;
          droneState.homingPhase = false; // No homing needed - start from current position
          droneState.lastUpdateTime = now - droneState.changeInterval; // Allow immediate new target generation

          if (debugMode) {
            logger.debug('User interaction ended - resuming drone from exact current position', {
              currentPos: `(${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)}, ${currentPos.z.toFixed(1)})`,
              newOffsets: `X:${droneState.offsetX.toFixed(2)}, Y:${droneState.offsetY.toFixed(2)}, Z:${droneState.offsetZ.toFixed(2)}`,
              newDistance: droneState.distance.toFixed(2),
              timeSinceInterrupt: timeSinceInterrupt.toFixed(0)
            });
          }
        } else {
          // Still waiting for user to finish - don't do any drone movement
          if (debugMode && Math.random() < 0.1) { // Occasional debug
            logger.debug('Waiting for user interaction to end', {
              timeSinceInterrupt: timeSinceInterrupt.toFixed(0),
              userInteracting: userInteractingRef.current
            });
          }
          return;
        }
      }

      // Handle homing phase - quickly settle into drone movement from user position
      if (droneState.homingPhase) {
        const homingDuration = 200; // 0.2 seconds to home in (much faster)
        const homingProgress = Math.min(1, (now - droneState.homingStartTime) / homingDuration);

        if (homingProgress >= 1) {
          // Homing complete, start random movement
          droneState.homingPhase = false;
          droneState.lastUpdateTime = now;
        }
        // No need to override targets during homing - let it settle naturally from user position
      }

      // Update drone targets periodically (only if not interrupted by user)
      // Allow target updates during homing for immediate movement
      if (!droneState.userInterrupted &&
          now - droneState.lastUpdateTime > droneState.changeInterval) {

        // Generate new random targets for free-flying bee-like movement around the target
        // Patterns: random, up, down, left, right, mostly in front, briefly behind
        const patterns = ['random', 'up', 'down', 'left', 'right', 'front', 'behind'];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];

        switch (pattern) {
          case 'up':
            droneState.targetOffsetX = (Math.random() - 0.5) * 10; // ±5 units
            droneState.targetOffsetY = 8 + Math.random() * 12; // 8-20 units up
            droneState.targetOffsetZ = 5 + Math.random() * 15; // 5-20 units ahead
            break;
          case 'down':
            droneState.targetOffsetX = (Math.random() - 0.5) * 10;
            droneState.targetOffsetY = -5 - Math.random() * 8; // -5 to -13 units down
            droneState.targetOffsetZ = 5 + Math.random() * 15;
            break;
          case 'left':
            droneState.targetOffsetX = -8 - Math.random() * 12; // -8 to -20 units left
            droneState.targetOffsetY = (Math.random() - 0.5) * 10;
            droneState.targetOffsetZ = 5 + Math.random() * 15;
            break;
          case 'right':
            droneState.targetOffsetX = 8 + Math.random() * 12; // 8-20 units right
            droneState.targetOffsetY = (Math.random() - 0.5) * 10;
            droneState.targetOffsetZ = 5 + Math.random() * 15;
            break;
          case 'front':
            droneState.targetOffsetX = (Math.random() - 0.5) * 20; // ±10 units
            droneState.targetOffsetY = (Math.random() - 0.5) * 16; // ±8 units
            droneState.targetOffsetZ = 10 + Math.random() * 20; // 10-30 units ahead
            break;
          case 'behind':
            droneState.targetOffsetX = (Math.random() - 0.5) * 16; // ±8 units
            droneState.targetOffsetY = (Math.random() - 0.5) * 12; // ±6 units
            droneState.targetOffsetZ = -5 - Math.random() * 10; // -5 to -15 units behind
            break;
          default: // 'random'
            droneState.targetOffsetX = (Math.random() - 0.5) * 30; // ±15 units left/right
            droneState.targetOffsetY = (Math.random() - 0.5) * 20; // ±10 units up/down
            droneState.targetOffsetZ = Math.random() * 40 - 10; // -10 to +30 units
            break;
        }

        droneState.targetDistance = 8 + Math.random() * 12; // 8-20 units distance from target
        droneState.lastUpdateTime = now;
        droneState.changeInterval = 1500 + Math.random() * 3000; // 1.5-4.5 seconds between changes

        if (debugMode) {
          logger.debug(`Drone mode: New ${pattern.toUpperCase()} pattern targets generated`, {
            targetOffsetX: `${droneState.targetOffsetX.toFixed(2)}`,
            targetOffsetY: `${droneState.targetOffsetY.toFixed(2)}`,
            targetOffsetZ: `${droneState.targetOffsetZ.toFixed(2)}`,
            targetDistance: `${droneState.targetDistance.toFixed(2)} (range: 8-20)`,
            nextChangeIn: `${droneState.changeInterval}ms`
          });
        }
      }

      // Smoothly interpolate to targets with faster movement for immediate visibility
      const lerpFactor = droneState.homingPhase ? 0.05 : 0.02; // Faster during homing, then moderate speed
      droneState.offsetX += (droneState.targetOffsetX - droneState.offsetX) * lerpFactor;
      droneState.offsetY += (droneState.targetOffsetY - droneState.offsetY) * lerpFactor;
      droneState.offsetZ += (droneState.targetOffsetZ - droneState.offsetZ) * lerpFactor;
      droneState.distance += (droneState.targetDistance - droneState.distance) * lerpFactor;

      // Calculate drone camera position - fly freely around the target like a bee
      // Position camera at desired distance from target in the direction of current offsets
      const offsetDirection = new Vector3(
        droneState.offsetX, // Free left/right movement (±15 units)
        droneState.offsetY, // Free up/down movement (±10 units, including below)
        droneState.offsetZ  // Free forward/backward movement (-10 to +30 units)
      ).normalize();

      // Use target for drone positioning
      const currentTarget = target;

      // Position camera at the desired distance from target in the offset direction
      const dronePosition = new Vector3().copy(currentTarget).add(
        offsetDirection.multiplyScalar(droneState.distance)
      );

      // Always look at the target (the marker we're following)
      const droneTarget = new Vector3(
        currentTarget.x,
        currentTarget.y, // Look directly at the timeline marker
        currentTarget.z
      );

      // Apply drone position directly to camera and controls without triggering state updates
      // BUT ONLY if user is not currently interacting
      if (!userInteractingRef.current) {
        camera.position.copy(dronePosition);
        if (orbitControlsRef.current) {
          orbitControlsRef.current.target.copy(droneTarget);
          orbitControlsRef.current.update();
        }
      }

      // DO NOT update camera state in drone mode to prevent infinite loops
      // The camera position is managed directly by the drone logic

      // Debug logging for drone mode (only occasionally to avoid spam)
      if (debugMode && Math.random() < 0.01) { // Log ~1% of frames
        logger.debug('FREE-FLYING Drone mode active', {
          markerPos: `(${currentTarget.x.toFixed(1)}, ${currentTarget.y.toFixed(1)}, ${currentTarget.z.toFixed(1)})`,
          dronePos: `(${dronePosition.x.toFixed(1)}, ${dronePosition.y.toFixed(1)}, ${dronePosition.z.toFixed(1)})`,
          offsets: `X:${droneState.offsetX.toFixed(2)} (±15), Y:${droneState.offsetY.toFixed(2)} (±10), Z:${droneState.offsetZ.toFixed(2)} (-10/+30)`,
          distance: `${droneState.distance.toFixed(2)} (8-20 range)`,
          direction: `(${offsetDirection.x.toFixed(2)}, ${offsetDirection.y.toFixed(2)}, ${offsetDirection.z.toFixed(2)})`
        });
      }

      return; // Skip normal camera monitoring when in drone mode
    } else {
      // When exiting drone mode, keep camera exactly where it is (no position change)
      if (droneStateRef.current.initialized) {
        // Mark drone mode as finished - DO NOT update camera state to prevent jumping
        droneStateRef.current.initialized = false;
        droneStateRef.current.homingPhase = false;
        droneStateRef.current.userInterrupted = false;

        // Set flag to prevent drift mode from interfering with camera position
        justExitedDroneModeRef.current = true;

        if (debugMode) {
          const currentPosition = camera.position;
          const currentTarget = target;
          logger.debug('Drone mode exit - camera stays at current position (no state update)', {
            position: `(${currentPosition.x.toFixed(1)}, ${currentPosition.y.toFixed(1)}, ${currentPosition.z.toFixed(1)})`,
            target: `(${currentTarget.x.toFixed(1)}, ${currentTarget.y.toFixed(1)}, ${currentTarget.z.toFixed(1)})`,
            distance: currentPosition.distanceTo(currentTarget).toFixed(1)
          });
        }

        return; // Skip normal monitoring during drone exit
      }
    }

    // Skip frame updates if user is currently interacting (OrbitControls will handle updates)
    if (userInteractingRef.current) return;

    // Skip if we just processed a controls update
    if (stateChangeSourceRef.current === 'controls') {
      stateChangeSourceRef.current = null;
      return;
    }

    // Throttle frame updates to prevent excessive Redux dispatches
    const currentTime = now; // Reuse the existing 'now' variable from line 514
    if (currentTime - lastUpdateTimeRef.current < updateThrottleMs) return;

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
    //   logger.debug('Periodic camera check:', {
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

    // Detect changes - use reasonable thresholds to prevent circular updates
    const positionChanged = currentPosition.distanceTo(cameraState.position) > 1.0; // Increased threshold
    const targetChanged = currentTarget.distanceTo(cameraState.target) > 0.5; // Increased threshold
    const zoomChanged = Math.abs(currentZoom - cameraState.zoom) > 0.1; // Less sensitive

    // Only update state if actual changes detected
    // Skip state updates during drone mode or when applying state to prevent infinite loops
    if ((positionChanged || targetChanged || zoomChanged) &&
        !droneMode &&
        !isApplyingStateRef.current) {

      // Update throttle timestamp
      lastUpdateTimeRef.current = currentTime;

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

      // Log when zoom changes to debug (only in debug mode)
      if (zoomChanged && debugMode) {
        logger.debug('Zoom changed:', {
          old: cameraState.zoom.toFixed(4),
          new: currentZoom.toFixed(4),
          diff: (currentZoom - cameraState.zoom).toFixed(4)
        });
      }

      updateCameraState(newState, 'frame');
    }
  });

  // Debug camera cycling effect (DISABLED to prevent infinite loops)
  useEffect(() => {
    // Disable debug cycling completely to prevent infinite loops
    // This feature can be re-enabled later with proper state isolation

    // Cleanup on unmount
    return () => {
      if (debugCycleTimer.current) {
        window.clearInterval(debugCycleTimer.current);
        debugCycleTimer.current = null;
      }
    };
  }, [debugMode]);

  return (
    <OrbitControls
      ref={orbitControlsRef}
      makeDefault
      target={[cameraState.target.x, cameraState.target.y, cameraState.target.z]}
      enablePan={(!debugMode || droneMode) && !disableControls}
      enableZoom={!disableControls}
      enableRotate={(!debugMode || droneMode) && !disableControls}
      minDistance={5}
      maxDistance={300}
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
      }}
      onChange={() => {
        if (!userInteractingRef.current) return;

        // Throttle onChange updates to prevent excessive Redux dispatches during dragging
        const changeTime = Date.now();
        if (changeTime - lastUpdateTimeRef.current < updateThrottleMs) return;

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
        currentZoomRef.current = cameraZoom;

        // Only update state if there are significant changes to prevent circular updates
        // Skip state updates during drone mode to prevent infinite loops
        const positionChanged = currentPosition.distanceTo(cameraState.position) > 1.0;
        const targetChanged = currentTarget.distanceTo(cameraState.target) > 0.5;
        const zoomChanged = Math.abs(cameraZoom - cameraState.zoom) > 0.1;

        if ((positionChanged || targetChanged || zoomChanged) && !droneMode) {
          // Update throttle timestamp
          lastUpdateTimeRef.current = changeTime;

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
        currentZoomRef.current = cameraZoom;
        // ...
        // Skip state updates during drone mode to prevent infinite loops
        if (!droneMode) {
          const finalState: CameraState = {
            position: currentPosition,
            target: currentTarget,
            zoom: cameraZoom
          };
          updateCameraState(finalState, 'controls');
        }
        userInteractingRef.current = false;
        if (debugMode) {
          logger.debug('User interaction ended with OrbitControls');
        }
      }}
    />
  );
};
