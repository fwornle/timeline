import { useEffect, useState, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
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
  
  // Track when initialization is complete
  const [initialized, setInitialized] = useState(false);
  
  // Track the source of state changes to prevent loops
  const stateChangeSourceRef = useRef<'init' | 'controls' | 'mode' | 'frame' | null>(null);
  
  // Track user interaction
  const userInteractingRef = useRef(false);
  
  // Helper to update camera state in a single place
  const updateCameraState = (
    newState: CameraState, 
    source: 'init' | 'controls' | 'mode' | 'frame'
  ) => {
    // Skip updates from specific sources during initialization
    if (!initialized && source !== 'init') return;
    
    // Skip redundant updates (no actual change)
    const positionEqual = newState.position.distanceTo(cameraState.position) < 0.1;
    const targetEqual = newState.target.distanceTo(cameraState.target) < 0.1;
    const zoomEqual = Math.abs(newState.zoom - cameraState.zoom) < 0.05;
    
    if (positionEqual && targetEqual && zoomEqual) {
      return;
    }
    
    // Update local state
    setCameraState({
      position: newState.position.clone(),
      target: newState.target.clone(),
      zoom: newState.zoom
    });
    
    // Mark the source of this state change
    stateChangeSourceRef.current = source;
    
    // Notify parent components
    if (onCameraStateChange) {
      console.log('[TimelineCamera] Sending state to parent:', {
        id: Date.now(),
        source,
        position: {
          x: newState.position.x.toFixed(2),
          y: newState.position.y.toFixed(2),
          z: newState.position.z.toFixed(2)
        },
        target: {
          x: newState.target.x.toFixed(2),
          y: newState.target.y.toFixed(2),
          z: newState.target.z.toFixed(2)
        },
        zoom: newState.zoom.toFixed(2),
        isClone: newState.position !== newState.position.clone()
      });
      onCameraStateChange(newState);
    }
    
    if (onCameraPositionChange) {
      onCameraPositionChange(newState.position);
    }
    
    if (debugMode) {
      console.log(`Camera state updated from ${source}:`, {
        position: {
          x: newState.position.x.toFixed(1),
          y: newState.position.y.toFixed(1),
          z: newState.position.z.toFixed(1)
        },
        target: {
          x: newState.target.x.toFixed(1),
          y: newState.target.y.toFixed(1),
          z: newState.target.z.toFixed(1)
        },
        zoom: newState.zoom.toFixed(1)
      });
    }
  };
  
  // Apply camera state to Three.js camera and controls
  const applyCameraState = (state: CameraState) => {
    // Apply position
    camera.position.copy(state.position);
    
    // Apply target to orbit controls
    if (orbitControlsRef.current) {
      orbitControlsRef.current.target.copy(state.target);
    }
    
    // Apply zoom
    camera.zoom = state.zoom;
    camera.updateProjectionMatrix();
    
    // Update controls if available
    if (orbitControlsRef.current) {
      orbitControlsRef.current.update();
    }
    
    // Log the state that was applied to help with debugging
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
      // Focus on current time point
      const newPosition = calculateFocusPosition(target);
      
      updateCameraState({
        position: newPosition,
        target: target.clone(),
        zoom: camera.zoom
      }, 'mode');
      
      logger.info('Setting camera to focus mode', {
        position: { x: newPosition.x, y: newPosition.y, z: newPosition.z },
        target: { x: target.x, y: target.y, z: target.z }
      });
    }
  }, [viewAllMode, focusCurrentMode, target, initialized, events]);
  
  // Update when target changes (for timeline movement)
  useEffect(() => {
    if (!initialized) return;
    
    // Skip if user is currently interacting or in specific view modes
    if (userInteractingRef.current || viewAllMode || focusCurrentMode) return;
    
    // Only update the target component of the state
    updateCameraState({
      ...cameraState,
      target: target.clone()
    }, 'frame');
    
  }, [target, initialized]);
  
  // Monitor camera changes from OrbitControls using useFrame
  useFrame(() => {
    if (!initialized || userInteractingRef.current) return;
    
    // Skip if the source was controls (to avoid feedback loops)
    if (stateChangeSourceRef.current === 'controls') {
      stateChangeSourceRef.current = null;
      return;
    }
    
    // Check for changes directly from Three.js camera/controls
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
    
    const currentZoom = camera.zoom;
    
    // Debug output to see actual camera values
    if (debugMode && Date.now() % 60 === 0) { // Only log occasionally
      console.log(`[TimelineCamera] Camera actual values:`, {
        position: { 
          x: currentPosition.x.toFixed(2), 
          y: currentPosition.y.toFixed(2), 
          z: currentPosition.z.toFixed(2) 
        },
        target: { 
          x: currentTarget.x.toFixed(2), 
          y: currentTarget.y.toFixed(2), 
          z: currentTarget.z.toFixed(2) 
        },
        zoom: currentZoom.toFixed(2)
      });
    }
    
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
  
  return (
    <OrbitControls
      ref={orbitControlsRef}
      makeDefault
      target={cameraState.target}
      enablePan={!debugMode}
      enableZoom={true}
      enableRotate={!debugMode}
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
        
        // Get current camera state with direct property access
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
        
        const currentZoom = camera.zoom;
        
        // ALWAYS update immediately on zoom changes to capture them
        if (Math.abs(currentZoom - cameraState.zoom) > 0.001) {
          console.log(`[TimelineCamera] Zoom changed during user interaction:`, {
            old: cameraState.zoom.toFixed(4),
            new: currentZoom.toFixed(4)
          });
          
          const newState: CameraState = {
            position: currentPosition,
            target: currentTarget,
            zoom: currentZoom
          };
          
          updateCameraState(newState, 'controls');
          return;
        }
        
        // For other changes, throttle updates to avoid flooding
        if (Date.now() % 5 === 0) {
          const newState: CameraState = {
            position: currentPosition,
            target: currentTarget,
            zoom: currentZoom
          };
          
          updateCameraState(newState, 'controls');
        }
      }}
      onEnd={() => {
        // Get final camera state after interaction with direct property access
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
        
        const currentZoom = camera.zoom;
        
        // Log the zoom at the end of interaction
        console.log(`[TimelineCamera] Interaction ended with zoom:`, currentZoom.toFixed(4));
        
        // ALWAYS send a final update with the latest state
        const finalState: CameraState = {
          position: currentPosition,
          target: currentTarget,
          zoom: currentZoom
        };
        
        updateCameraState(finalState, 'controls');
        
        // Reset interaction flag after the update
        userInteractingRef.current = false;
        
        if (debugMode) {
          console.log('User interaction ended with OrbitControls');
        }
      }}
    />
  );
};
