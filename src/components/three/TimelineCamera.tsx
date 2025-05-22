import { useEffect, useState, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useLogger } from '../../utils/logging/hooks/useLogger';
import type { TimelineEvent } from '../../data/types/TimelineEvent';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

// Define DEBUG_POSITIONS array with improved positions for better timeline viewing
const DEBUG_POSITIONS = [
  { position: new Vector3(-50, 70, -50), name: "Preferred View" },      // Preferred view from above with timeline from top-left to bottom-right
  { position: new Vector3(-40, 35, -30), name: "Timeline Overview" },   // Good position to see entire timeline
  { position: new Vector3(-30, 25, 0), name: "Timeline Middle" },       // View from the middle
  { position: new Vector3(-20, 15, 30), name: "Timeline End" },         // View from the end
  { position: new Vector3(-35, 30, -50), name: "Timeline Start" },      // View from the start
  { position: new Vector3(0, 50, 0), name: "Top Down" },                // Bird's eye view
  { position: new Vector3(-50, 40, -40), name: "Far Overview" }         // Far back view to see everything
];

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
  // Position camera closer to the target for a focused view
  // Use a consistent distance for better user experience
  const distance = 15; // Closer distance for better focus

  return new Vector3(
    -distance * 0.8,  // Position to the left
    distance * 1.2,   // Position higher above for a more top-down view
    target.z - 5      // Stay at target's Z position but slightly offset to see more context
  );
};

export const TimelineCamera: React.FC<TimelineCameraProps> = ({
  target,
  viewAllMode = false,
  focusCurrentMode = false,
  events = [],
  debugMode = false,
  onCameraPositionChange,
  onCameraStateChange,
  initialCameraState,
}) => {
  const { camera } = useThree();
  const [initialPositionSet, setInitialPositionSet] = useState(false);
  const logger = useLogger({ component: 'TimelineCamera', topic: 'ui' });
  const lastViewModeRef = useRef({ viewAll: false, focusCurrent: false });
  const userControlledRef = useRef(false);
  const orbitControlsRef = useRef<OrbitControlsImpl>(null);
  const lastCameraStateRef = useRef<CameraState | null>(null);
  const originalPositionRef = useRef<Vector3 | null>(null);

  // Debug the orbit controls reference
  useEffect(() => {
    if (debugMode && orbitControlsRef.current) {
      logger.debug('OrbitControls reference set', {
        target: orbitControlsRef.current.target,
        hasRef: !!orbitControlsRef.current
      });
    }
  }, [orbitControlsRef.current, debugMode, logger]);

  // Handle initial camera setup - only once
  useEffect(() => {
    if (initialPositionSet) return;

    // Use initialCameraState if provided, otherwise use default position
    if (initialCameraState) {
      // Set camera position
      camera.position.copy(initialCameraState.position);

      // Set orbit controls target
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.copy(initialCameraState.target);
      }

      // Set camera look direction
      camera.lookAt(initialCameraState.target);

      // Set zoom level
      camera.zoom = initialCameraState.zoom;
      camera.updateProjectionMatrix();

      // Update controls if available
      if (orbitControlsRef.current) {
        orbitControlsRef.current.update();
      }

      // Update last position and target references for tracking changes
      lastPositionRef.current.copy(camera.position);
      lastTargetRef.current.copy(initialCameraState.target);

      // Update last camera state reference
      lastCameraStateRef.current = initialCameraState;

      // Notify parent components of the applied state
      if (onCameraPositionChange) {
        onCameraPositionChange(initialCameraState.position);
      }

      if (onCameraStateChange) {
        onCameraStateChange(initialCameraState);
      }

      logger.info('Initial camera state restored from saved settings', {
        position: {
          x: initialCameraState.position.x,
          y: initialCameraState.position.y,
          z: initialCameraState.position.z
        },
        target: {
          x: initialCameraState.target.x,
          y: initialCameraState.target.y,
          z: initialCameraState.target.z
        },
        zoom: initialCameraState.zoom
      });
    } else {
      // Set initial camera position to look at the timeline from above
      // This position shows the timeline stretching from top left to bottom right corner
      // with cards facing into the camera
      const initialPosition = new Vector3(-35, 30, -50);
      camera.position.copy(initialPosition);

      // Use the provided target or default to origin
      const initialTarget = target || new Vector3(0, 0, 0);
      camera.lookAt(initialTarget);

      // Update the orbit controls target if available
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.copy(initialTarget);
        orbitControlsRef.current.update();
      }

      // Update last target reference
      lastTargetRef.current.copy(initialTarget);

      logger.info('Initial camera position set to default', {
        position: { x: initialPosition.x, y: initialPosition.y, z: initialPosition.z },
        target: { x: initialTarget.x, y: initialTarget.y, z: initialTarget.z }
      });
    }

    setInitialPositionSet(true);
  }, [camera, initialCameraState, initialPositionSet, logger]);

  // Handle view mode changes (viewAllMode or focusCurrentMode)
  useEffect(() => {
    // Check if view mode has changed from the previous state
    const viewModeChanged =
      viewAllMode !== lastViewModeRef.current.viewAll ||
      focusCurrentMode !== lastViewModeRef.current.focusCurrent;

    if (viewAllMode) {
      // View all events
      const newCameraPosition = calculateViewAllPosition(target, events);
      camera.position.copy(newCameraPosition);
      camera.lookAt(target);

      // Update orbit controls target
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.copy(target);
        orbitControlsRef.current.update();
      }

      // Update last target reference
      lastTargetRef.current.copy(target);

      userControlledRef.current = false;

      logger.info('Setting camera to view all mode', {
        position: { x: newCameraPosition.x, y: newCameraPosition.y, z: newCameraPosition.z },
        target: { x: target.x, y: target.y, z: target.z },
        changed: viewModeChanged
      });
    }
    else if (focusCurrentMode) {
      // Focus on current time point
      const newCameraPosition = calculateFocusPosition(target);
      camera.position.copy(newCameraPosition);
      camera.lookAt(target);

      // Update orbit controls target
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.copy(target);
        orbitControlsRef.current.update();
      }

      // Update last target reference
      lastTargetRef.current.copy(target);

      userControlledRef.current = false;

      logger.info('Setting camera to focus mode', {
        position: { x: newCameraPosition.x, y: newCameraPosition.y, z: newCameraPosition.z },
        target: { x: target.x, y: target.y, z: target.z },
        changed: viewModeChanged
      });
    }

    // Update the last view mode
    lastViewModeRef.current = { viewAll: viewAllMode, focusCurrent: focusCurrentMode };
  }, [viewAllMode, focusCurrentMode, target, camera, logger, events]);

  // Track camera state changes and notify parent component
  const lastPositionRef = useRef(new Vector3());

  // Track the last frame time to limit update frequency
  const lastUpdateTimeRef = useRef(0);
  const lastTargetRef = useRef(new Vector3());

  // Rewrite the debug mode cycling effect to be more robust
  useEffect(() => {
    console.log('[DEBUG CYCLING] Effect triggered with debugMode:', debugMode);
    
    // Clear any existing interval - IMPORTANT
    let cycleInterval: number | undefined;
    
    // If entering debug mode, store original position
    if (debugMode && camera) {
      console.log('[DEBUG CYCLING] Debug mode activated');
      
      // Store original position only when first entering debug mode
      if (!originalPositionRef.current) {
        originalPositionRef.current = camera.position.clone();
        console.log('[DEBUG CYCLING] Stored original camera position:', originalPositionRef.current);
      }
      
      // Simple non-React-state-dependent position cycling
      let posIndex = 0;
      
      // Move to first position immediately
      const firstPosition = DEBUG_POSITIONS[posIndex];
      console.log(`[DEBUG CYCLING] Moving to initial position "${firstPosition.name}"`);
      
      // Direct camera manipulation
      camera.position.copy(firstPosition.position);
      camera.lookAt(target);
      
      // Update orbit controls if they exist
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.copy(target);
        orbitControlsRef.current.update();
      }
      
      // Create camera state for notification
      const newState: CameraState = {
        position: firstPosition.position.clone(),
        target: target.clone(),
        zoom: camera.zoom
      };
      
      // Update refs
      lastPositionRef.current.copy(firstPosition.position);
      lastTargetRef.current.copy(target);
      lastCameraStateRef.current = newState;
      
      // Notify parent components
      if (onCameraStateChange) {
        console.log('[DEBUG CYCLING] Notifying of initial debug position state');
        onCameraStateChange(newState);
      }
      
      // Set up cycling interval that DOESN'T depend on React state
      cycleInterval = window.setInterval(() => {
        // Increment position index
        posIndex = (posIndex + 1) % DEBUG_POSITIONS.length;
        
        // Get new position
        const { position, name } = DEBUG_POSITIONS[posIndex];
        console.log(`[DEBUG CYCLING] Cycling to position "${name}" (index ${posIndex})`);
        
        // Direct camera manipulation
        camera.position.copy(position);
        camera.lookAt(target);
        
        // Update orbit controls if they exist
        if (orbitControlsRef.current) {
          orbitControlsRef.current.target.copy(target);
          orbitControlsRef.current.update();
        }
        
        // Create camera state for notification
        const newState: CameraState = {
          position: position.clone(),
          target: target.clone(),
          zoom: camera.zoom
        };
        
        // Update refs
        lastPositionRef.current.copy(position);
        lastTargetRef.current.copy(target);
        lastCameraStateRef.current = newState;
        
        // Notify parent components
        if (onCameraStateChange) {
          console.log('[DEBUG CYCLING] Notifying of position change', {
            position: {
              x: position.x.toFixed(1),
              y: position.y.toFixed(1),
              z: position.z.toFixed(1)
            },
            target: {
              x: target.x.toFixed(1),
              y: target.y.toFixed(1),
              z: target.z.toFixed(1)
            },
            zoom: camera.zoom.toFixed(1)
          });
          
          // Log what's being sent out
          console.log('[DEBUG CYCLING] newState object being sent:', JSON.stringify({
            position: {
              x: newState.position.x,
              y: newState.position.y,
              z: newState.position.z
            },
            target: {
              x: newState.target.x,
              y: newState.target.y,
              z: newState.target.z
            },
            zoom: newState.zoom
          }));
          
          onCameraStateChange(newState);
        }
      }, 2000);
      
      console.log('[DEBUG CYCLING] Interval set with ID:', cycleInterval);
    } else if (!debugMode && originalPositionRef.current) {
      // Restore original position when exiting debug mode
      console.log('[DEBUG CYCLING] Debug mode deactivated, restoring original position');
      
      // Restore camera position
      camera.position.copy(originalPositionRef.current);
      camera.lookAt(target);
      
      // Update orbit controls if they exist
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.copy(target);
        orbitControlsRef.current.update();
      }
      
      // Create camera state for notification
      const restoredState: CameraState = {
        position: originalPositionRef.current.clone(),
        target: target.clone(),
        zoom: camera.zoom
      };
      
      // Update refs
      lastPositionRef.current.copy(originalPositionRef.current);
      lastTargetRef.current.copy(target);
      lastCameraStateRef.current = restoredState;
      
      // Notify parent components
      if (onCameraStateChange) {
        console.log('[DEBUG CYCLING] Notifying of restored original position');
        onCameraStateChange(restoredState);
      }
      
      // Clear the stored original position
      originalPositionRef.current = null;
    }
    
    // Cleanup function
    return () => {
      if (cycleInterval) {
        console.log('[DEBUG CYCLING] Clearing interval:', cycleInterval);
        window.clearInterval(cycleInterval);
      }
    };
  }, [debugMode, camera, target]);

  // Optimize the useFrame hook to reduce console spam
  useFrame(({ clock }) => {
    // Skip camera updates completely in debug mode
    if (debugMode) {
      return; // Let the debug cycling handle camera positioning
    }
    
    // Only update at most 5 times per second to reduce console spam
    const currentTime = clock.getElapsedTime();
    const shouldUpdate = currentTime - lastUpdateTimeRef.current > 0.2; // 200ms between updates
    
    if (!shouldUpdate) {
      return; // Skip this frame to reduce overhead
    }
    
    // Update last update time
    lastUpdateTimeRef.current = currentTime;

    // Get the current target from OrbitControls
    let currentTarget: Vector3;

    if (orbitControlsRef.current) {
      // Use the orbit controls target if available
      currentTarget = new Vector3().copy(orbitControlsRef.current.target);
    } else if (target) {
      // Fallback to the provided target prop if orbit controls not available
      currentTarget = new Vector3().copy(target);

      if (debugMode && shouldUpdate) {
        logger.debug('Using fallback target (no orbit controls)', {
          target: { x: target.x, y: target.y, z: target.z }
        });
      }
    } else {
      // Last resort fallback
      currentTarget = new Vector3(0, 0, 0);

      if (debugMode && shouldUpdate) {
        logger.debug('Using default target (0,0,0) - no valid target available');
      }
    }

    // Check if position, target, or zoom has changed
    const positionChanged = camera.position.distanceTo(lastPositionRef.current) > 0.01;
    const targetChanged = currentTarget.distanceTo(lastTargetRef.current) > 0.01;
    const zoomChanged = Math.abs(camera.zoom - (lastCameraStateRef.current?.zoom || 1)) > 0.01;

    // Check for user interaction 
    const userInteracted = userControlledRef.current;

    // Log changes less frequently to avoid flooding console
    const shouldLog = debugMode && shouldUpdate && 
                     (positionChanged || targetChanged || zoomChanged || userInteracted);
                     
    if (shouldLog) {
      // Using console.debug instead of console.log for less intrusive logging
      console.debug('Camera state change detected in useFrame:', {
        positionChanged,
        targetChanged,
        zoomChanged,
        userInteracted,
        position: { 
          x: camera.position.x.toFixed(2), 
          y: camera.position.y.toFixed(2), 
          z: camera.position.z.toFixed(2) 
        },
        target: { 
          x: currentTarget.x.toFixed(2), 
          y: currentTarget.y.toFixed(2), 
          z: currentTarget.z.toFixed(2) 
        },
        zoom: camera.zoom.toFixed(2)
      });
    }

    // Only update state if something changed
    if (positionChanged || targetChanged || zoomChanged || userInteracted) {
      // Reset the user interaction flag after applying the update
      if (userInteracted) {
        userControlledRef.current = false;
      }

      // Create a new Vector3 to avoid reference issues
      const currentPosition = new Vector3(
        Math.round(camera.position.x * 100) / 100,
        Math.round(camera.position.y * 100) / 100,
        Math.round(camera.position.z * 100) / 100
      );

      // Round target values for consistency
      const roundedTarget = new Vector3(
        Math.round(currentTarget.x * 100) / 100,
        Math.round(currentTarget.y * 100) / 100,
        Math.round(currentTarget.z * 100) / 100
      );

      // Get current zoom level
      const currentZoom = Math.round(camera.zoom * 100) / 100;

      // Create full camera state
      const cameraState: CameraState = {
        position: currentPosition,
        target: roundedTarget,
        zoom: currentZoom
      };

      // Update last position and target references
      lastPositionRef.current.copy(camera.position);
      lastTargetRef.current.copy(currentTarget);

      // Update last camera state reference
      lastCameraStateRef.current = cameraState;

      // Call position change callback if provided
      if (onCameraPositionChange) {
        onCameraPositionChange(currentPosition);
      }

      // Call state change callback if provided
      if (onCameraStateChange) {
        onCameraStateChange(cameraState);
      }
    }
  });

  // Ensure the target is properly initialized
  useEffect(() => {
    if (orbitControlsRef.current && target) {
      // Update the orbit controls target when the target prop changes
      orbitControlsRef.current.target.copy(target);

      // Also update the last target reference
      lastTargetRef.current.copy(target);

      if (debugMode) {
        logger.debug('Updated orbit controls target from prop', {
          target: { x: target.x, y: target.y, z: target.z }
        });
      }
    }
  }, [target, debugMode, logger]);

  return (
    <OrbitControls
      ref={orbitControlsRef}
      makeDefault
      target={target}
      enablePan={!debugMode}
      enableZoom={!debugMode}
      enableRotate={!debugMode}
      minDistance={5}
      maxDistance={150}
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      maxAzimuthAngle={Infinity}
      minAzimuthAngle={-Infinity}
      enableDamping={true}
      dampingFactor={0.2}
      rotateSpeed={0.8}
      zoomSpeed={1.0}
      panSpeed={0.8}
      autoRotate={false}
      onStart={() => {
        // Set user controlled flag at start of interaction
        userControlledRef.current = true;
        
        console.log('User interaction started with OrbitControls');
        if (debugMode) {
          logger.debug('TimelineCamera: User interaction started');
        }
      }}
      onChange={() => {
        // Flag that user is controlling camera
        userControlledRef.current = true;
        console.log('OrbitControls onChange triggered');

        // Immediately update camera state when user interacts with controls
        if (onCameraStateChange && orbitControlsRef.current) {
          const currentPosition = new Vector3(
            Math.round(camera.position.x * 100) / 100,
            Math.round(camera.position.y * 100) / 100,
            Math.round(camera.position.z * 100) / 100
          );

          const currentTarget = new Vector3().copy(orbitControlsRef.current.target);
          currentTarget.x = Math.round(currentTarget.x * 100) / 100;
          currentTarget.y = Math.round(currentTarget.y * 100) / 100;
          currentTarget.z = Math.round(currentTarget.z * 100) / 100;

          // Get current zoom level
          const currentZoom = Math.round(camera.zoom * 100) / 100;

          const cameraState: CameraState = {
            position: currentPosition,
            target: currentTarget,
            zoom: currentZoom
          };

          console.log('Camera state from user interaction:', {
            position: { x: currentPosition.x, y: currentPosition.y, z: currentPosition.z },
            target: { x: currentTarget.x, y: currentTarget.y, z: currentTarget.z },
            zoom: currentZoom
          });

          // Only log in debug mode
          if (debugMode) {
            logger.debug('TimelineCamera: Controls changed', {
              position: { x: currentPosition.x, y: currentPosition.y, z: currentPosition.z },
              target: { x: currentTarget.x, y: currentTarget.y, z: currentTarget.z },
              zoom: currentZoom
            });
          }
          
          // Update last state references
          lastPositionRef.current.copy(currentPosition);
          lastTargetRef.current.copy(currentTarget);
          lastCameraStateRef.current = cameraState;

          // Notify parent components
          console.log('Calling onCameraStateChange from onChange handler');
          onCameraStateChange(cameraState);

          // Also update position for backward compatibility
          if (onCameraPositionChange) {
            console.log('Calling onCameraPositionChange from onChange handler');
            onCameraPositionChange(currentPosition);
          }
        }
      }}
      onEnd={() => {
        // Ensure final state is captured at end of interaction
        console.log('User interaction ended with OrbitControls');
        if (onCameraStateChange && orbitControlsRef.current) {
          const currentPosition = new Vector3(
            Math.round(camera.position.x * 100) / 100,
            Math.round(camera.position.y * 100) / 100,
            Math.round(camera.position.z * 100) / 100
          );

          const currentTarget = new Vector3().copy(orbitControlsRef.current.target);
          currentTarget.x = Math.round(currentTarget.x * 100) / 100;
          currentTarget.y = Math.round(currentTarget.y * 100) / 100;
          currentTarget.z = Math.round(currentTarget.z * 100) / 100;

          // Get current zoom level
          const currentZoom = Math.round(camera.zoom * 100) / 100;

          const cameraState: CameraState = {
            position: currentPosition,
            target: currentTarget,
            zoom: currentZoom
          };
          
          // Log the final camera state
          console.log('Final camera state from user interaction:', {
            position: { x: currentPosition.x, y: currentPosition.y, z: currentPosition.z },
            target: { x: currentTarget.x, y: currentTarget.y, z: currentTarget.z },
            zoom: currentZoom
          });
          
          if (debugMode) {
            logger.debug('TimelineCamera: User interaction ended', {
              position: { x: currentPosition.x, y: currentPosition.y, z: currentPosition.z },
              target: { x: currentTarget.x, y: currentTarget.y, z: currentTarget.z },
              zoom: currentZoom
            });
          }
          
          // Update last state references
          lastPositionRef.current.copy(currentPosition);
          lastTargetRef.current.copy(currentTarget);
          lastCameraStateRef.current = cameraState;

          // Notify parent components with final state
          console.log('Calling onCameraStateChange from onEnd handler');
          onCameraStateChange(cameraState);
        }
      }}
    />
  );
};
