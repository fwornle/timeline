import { useEffect, useState, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useLogger } from '../../utils/logging/hooks/useLogger';
import type { TimelineEvent } from '../../data/types/TimelineEvent';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

// Define DEBUG_POSITIONS array with improved positions for better timeline viewing
const DEBUG_POSITIONS = [
  { position: new Vector3(-40, 35, -30), name: "Timeline Overview" },    // Good position to see entire timeline
  { position: new Vector3(-30, 25, 0), name: "Timeline Middle" },       // View from the middle
  { position: new Vector3(-20, 15, 30), name: "Timeline End" },         // View from the end
  { position: new Vector3(-35, 30, -50), name: "Timeline Start" },      // View from the start
  { position: new Vector3(0, 50, 0), name: "Top Down" },                // Bird's eye view
  { position: new Vector3(-50, 40, -40), name: "Far Overview" }         // Far back view to see everything
];

interface TimelineCameraProps {
  target: Vector3;
  viewAllMode?: boolean;
  focusCurrentMode?: boolean;
  events?: TimelineEvent[]; // For calculating the bounds of all events
  debugMode?: boolean; // Enable camera position cycling for debugging
}

// Calculate a position that shows the timeline from above-left with timeline stretching from top-left to bottom-right
const calculateViewAllPosition = (target: Vector3, events: TimelineEvent[] = []): Vector3 => {
  // If we have events, calculate a position that shows all of them
  if (events && events.length > 0) {
    // Estimate the length of the timeline based on number of events
    // Assuming events are spaced by ~5 units as in TimelineEvents.tsx
    const spacing = 5;
    const timelineLength = Math.max(events.length * spacing, 100);

    // Calculate distance based on timeline length
    // The longer the timeline, the further back we need to be
    const distance = Math.max(50, timelineLength * 0.8);

    // Position camera at an angle to see the timeline from above-left
    // This will show the timeline stretching from top left to bottom right
    return new Vector3(
      -distance * 0.9,        // Position further to the left
      distance * 0.8,         // Position higher above to see more of the timeline
      -timelineLength * 0.4   // Position toward the start of the timeline
    );
  }

  // Fallback for when we don't have events or can't calculate bounds
  return new Vector3(
    -50, // Position further to the left
    45,  // Position higher above
    -40  // Position further toward the start of the timeline
  );
};

// Calculate a position that focuses on the current time point
const calculateFocusPosition = (target: Vector3): Vector3 => {
  // Position camera closer to the target for a focused view
  // Use a consistent distance for better user experience
  const distance = 10; // Closer distance for better focus

  return new Vector3(
    -distance * 0.8,  // Position to the left
    distance * 0.6,   // Position above
    target.z         // Stay at target's Z position
  );
};

export const TimelineCamera: React.FC<TimelineCameraProps> = ({
  target,
  viewAllMode = false,
  focusCurrentMode = false,
  events = [],
  debugMode = false,
}) => {
  const { camera } = useThree();
  const [initialPositionSet, setInitialPositionSet] = useState(false);
  const logger = useLogger({ component: 'TimelineCamera', topic: 'ui' });
  const lastViewModeRef = useRef({ viewAll: false, focusCurrent: false });
  const userControlledRef = useRef(false);
  const [debugPositionIndex, setDebugPositionIndex] = useState(0);
  const orbitControlsRef = useRef<OrbitControlsImpl>(null);

  // Handle initial camera setup - only once
  useEffect(() => {
    if (initialPositionSet) return;

    // Set initial camera position to look at the timeline from above-left
    // This position shows the timeline stretching from top left to bottom right corner
    const initialPosition = new Vector3(-45, 40, -40);
    camera.position.copy(initialPosition);
    camera.lookAt(new Vector3(0, 2, 0));

    setInitialPositionSet(true);
    logger.info('Initial camera position set', {
      position: { x: initialPosition.x, y: initialPosition.y, z: initialPosition.z }
    });
  }, [camera, target, initialPositionSet, logger]);

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
      userControlledRef.current = false;

      logger.info('Setting camera to view all mode', {
        position: { x: newCameraPosition.x, y: newCameraPosition.y, z: newCameraPosition.z },
        changed: viewModeChanged
      });
    }
    else if (focusCurrentMode) {
      // Focus on current time point
      const newCameraPosition = calculateFocusPosition(target);
      camera.position.copy(newCameraPosition);
      camera.lookAt(target);
      userControlledRef.current = false;

      logger.info('Setting camera to focus mode', {
        position: { x: newCameraPosition.x, y: newCameraPosition.y, z: newCameraPosition.z },
        changed: viewModeChanged
      });
    }

    // Update the last view mode
    lastViewModeRef.current = { viewAll: viewAllMode, focusCurrent: focusCurrentMode };
  }, [viewAllMode, focusCurrentMode, target, camera, logger, events]);

  // Debug mode - cycle through camera positions
  useEffect(() => {
    let intervalId: number | undefined;

    if (debugMode && camera && orbitControlsRef.current) {
      logger.info('Debug mode activated - cycling camera positions');

      const cycle = () => {
        const nextIndex = (debugPositionIndex + 1) % DEBUG_POSITIONS.length;
        const { position, name } = DEBUG_POSITIONS[nextIndex];

        camera.position.copy(position);
        // For debug, look at a fixed point or center of timeline, e.g., new Vector3(0, 2, 0)
        // Or, if you want it to follow the `target` prop:
        camera.lookAt(target);
        if (orbitControlsRef.current) {
          orbitControlsRef.current.target.copy(target); // Ensure controls target is also updated
        }

        logger.info(`Camera moved to debug position: ${name}`, { position });
        setDebugPositionIndex(nextIndex);
      };

      // Initial move
      const initialDebugPosition = DEBUG_POSITIONS[debugPositionIndex];
      camera.position.copy(initialDebugPosition.position);
      camera.lookAt(target);
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.copy(target);
      }
      logger.info(`Camera moved to initial debug position: ${initialDebugPosition.name}`, { position: initialDebugPosition.position });

      intervalId = window.setInterval(cycle, 3000); // Cycle every 3 seconds
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
        logger.info('Debug mode deactivated or component unmounted');
      }
    };
  }, [debugMode, camera, target, logger, debugPositionIndex]);

  return (
    <OrbitControls
      ref={orbitControlsRef}
      makeDefault
      target={target}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={5}
      maxDistance={150}
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      maxAzimuthAngle={Infinity}
      minAzimuthAngle={-Infinity}
      onChange={() => {
        if (!debugMode) {
          userControlledRef.current = true;
        }
      }}
    />
  );
};
