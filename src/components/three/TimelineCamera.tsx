import { useRef, useEffect, useState } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useLogger } from '../../utils/logging/hooks/useLogger';
import type { TimelineEvent } from '../../data/types/TimelineEvent';

// Debug camera positions
const DEBUG_POSITIONS = [
  { position: new Vector3(-30, 20, 30), name: "Overview" },
  { position: new Vector3(-10, 40, 10), name: "Top View" },
  { position: new Vector3(-5, 10, 40), name: "Side View" },
  { position: new Vector3(-40, 5, 0), name: "Front View" },
  { position: new Vector3(-20, 15, -20), name: "Reverse View" }
];

interface TimelineCameraProps {
  target: Vector3;
  viewAllMode?: boolean;
  focusCurrentMode?: boolean;
  events?: TimelineEvent[]; // For calculating the bounds of all events
  debugMode?: boolean; // Enable camera position cycling for debugging
}

// Calculate a position that shows the timeline from bottom left with newest data at bottom left
const calculateViewAllPosition = (target: Vector3, events: TimelineEvent[] = []): Vector3 => {
  // If we have events, calculate a position that shows all of them
  if (events && events.length > 0) {
    // For the timeline visualization, we know events are positioned along the Z-axis
    // with alternating X positions, so we can use a simpler approach

    // Estimate the length of the timeline based on number of events
    // Assuming events are spaced by ~5 units as in TimelineEvents.tsx
    const spacing = 5;
    const timelineLength = events.length * spacing;

    // Position camera to see the entire timeline
    // We want to be far enough back to see all events
    const distance = Math.max(30, timelineLength * 0.8);

    // Position camera at an angle to see the timeline from the side
    return new Vector3(
      -distance,        // Position to the left
      distance * 0.7,   // Position above proportional to the distance
      target.z + distance * 0.5  // Position behind the target
    );
  }

  // Fallback for when we don't have events or can't calculate bounds
  return new Vector3(
    target.x - 30, // Position to the left
    30,           // Position above
    target.z + 30  // Position behind
  );
};

// Calculate a position that focuses on the current time point
const calculateFocusPosition = (target: Vector3): Vector3 => {
  // Position camera closer to the target for a focused view
  // Use a consistent distance for better user experience
  const distance = 10; // Closer distance for better focus

  return new Vector3(
    target.x - distance * 0.8, // Position to the left
    distance * 0.6,           // Position above
    target.z + distance * 0.3  // Position behind but closer to target
  );
};

interface OrbitControlsRef {
  target: Vector3;
  addEventListener: (event: string, handler: () => void) => void;
  removeEventListener: (event: string, handler: () => void) => void;
}

export const TimelineCamera: React.FC<TimelineCameraProps> = ({
  target,
  viewAllMode = false,
  focusCurrentMode = false,
  events = [],
  debugMode = false
}) => {
  const controlsRef = useRef<OrbitControlsRef | null>(null);
  const { camera } = useThree();
  const [initialPositionSet, setInitialPositionSet] = useState(false);
  const logger = useLogger({ component: 'TimelineCamera', topic: 'ui' });
  const lastViewModeRef = useRef({ viewAll: false, focusCurrent: false });
  const lastTargetRef = useRef(new Vector3());
  const userControlledRef = useRef(false);
  const [debugPositionIndex, setDebugPositionIndex] = useState(0);

  // Set up a listener for user interaction with controls
  useEffect(() => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;

    // Mark as user-controlled when the user interacts with controls
    const handleChange = () => {
      userControlledRef.current = true;
    };

    // Add event listeners for user interaction
    controls.addEventListener('change', handleChange);

    return () => {
      controls.removeEventListener('change', handleChange);
    };
  }, []);

  // Handle initial camera setup - only once
  useEffect(() => {
    if (initialPositionSet || !controlsRef.current) return;

    // Set initial camera position only once
    // We'll use a more neutral position that doesn't trigger the "view all" mode
    const initialDistance = 20;
    const initialPosition = new Vector3(
      target.x - initialDistance * 0.8,
      initialDistance * 0.6,
      target.z + initialDistance * 0.5
    );

    camera.position.copy(initialPosition);
    camera.lookAt(target);

    setInitialPositionSet(true);
    logger.info('Initial camera position set', {
      position: { x: initialPosition.x, y: initialPosition.y, z: initialPosition.z }
    });
  }, [camera, target, initialPositionSet, logger]);

  // Update controls target when target changes
  useEffect(() => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current as { target: Vector3 };

    // Only update the target if it has changed significantly
    if (!lastTargetRef.current.equals(target)) {
      controls.target.copy(target);
      lastTargetRef.current.copy(target);
    }
  }, [target]);

  // Debug mode - cycle through camera positions
  useEffect(() => {
    // Clean up previous interval if any (important for mode transitions)
    let intervalId: number | null = null;
    
    if (debugMode && camera) {
      // Start cycling through positions
      logger.info('Debug mode activated - cycling through camera positions');

      // Immediately move to the first position when debug mode is activated
      const initialPosition = DEBUG_POSITIONS[debugPositionIndex].position;
      const initialName = DEBUG_POSITIONS[debugPositionIndex].name;

      // Update camera position
      camera.position.copy(initialPosition);
      camera.lookAt(target);

      // Update controls target if available
      if (controlsRef.current) {
        const controls = controlsRef.current as { target: Vector3 };
        controls.target.copy(target);
      }

      // Log the initial position change
      logger.info(`Camera moved to debug position: ${initialName}`, {
        position: { x: initialPosition.x, y: initialPosition.y, z: initialPosition.z }
      });

      intervalId = window.setInterval(() => {
        // Calculate the next position index
        const nextIndex = (debugPositionIndex + 1) % DEBUG_POSITIONS.length;

        // Move to the next position
        const position = DEBUG_POSITIONS[nextIndex].position;
        const name = DEBUG_POSITIONS[nextIndex].name;

        // Update camera position
        camera.position.copy(position);
        camera.lookAt(target);

        // Update controls target if available
        if (controlsRef.current) {
          const controls = controlsRef.current as { target: Vector3 };
          controls.target.copy(target);
        }

        // Log the position change
        logger.info(`Camera moved to debug position: ${name}`, {
          position: { x: position.x, y: position.y, z: position.z }
        });

        // Move to the next position index
        setDebugPositionIndex(nextIndex);
      }, 2000); // Change position every 2 seconds
    }

    // Clean up interval on unmount or when debug mode changes
    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        logger.info('Debug mode deactivated or component unmounted');
      }
    };
  }, [debugMode, camera, target, logger, debugPositionIndex]);

  // Handle view mode changes (viewAllMode or focusCurrentMode)
  useEffect(() => {
    if (!controlsRef.current || !camera) return;

    // Check if view mode has changed from the previous state
    const viewModeChanged =
      viewAllMode !== lastViewModeRef.current.viewAll ||
      focusCurrentMode !== lastViewModeRef.current.focusCurrent;

    // Always apply view modes, even if they're the same as before
    // This ensures the buttons work even when clicked multiple times
    if (viewAllMode) {
      // View all events
      const newCameraPosition = calculateViewAllPosition(target, events);

      // Update camera position
      camera.position.copy(newCameraPosition);
      camera.lookAt(target);

      // Update controls target
      if (controlsRef.current) {
        const controls = controlsRef.current as { target: Vector3 };
        controls.target.copy(target);
      }

      // Reset user control flag
      userControlledRef.current = false;

      logger.info('Setting camera to view all mode', {
        position: { x: newCameraPosition.x, y: newCameraPosition.y, z: newCameraPosition.z },
        changed: viewModeChanged
      });
    }
    else if (focusCurrentMode) {
      // Focus on current time point
      const newCameraPosition = calculateFocusPosition(target);

      // Update camera position
      camera.position.copy(newCameraPosition);
      camera.lookAt(target);

      // Update controls target
      if (controlsRef.current) {
        const controls = controlsRef.current as { target: Vector3 };
        controls.target.copy(target);
      }

      // Reset user control flag
      userControlledRef.current = false;

      logger.info('Setting camera to focus mode', {
        position: { x: newCameraPosition.x, y: newCameraPosition.y, z: newCameraPosition.z },
        changed: viewModeChanged
      });
    }

    // Update the last view mode
    lastViewModeRef.current = { viewAll: viewAllMode, focusCurrent: focusCurrentMode };
  }, [viewAllMode, focusCurrentMode, target, camera, logger, events]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={5}
      maxDistance={100}
      minPolarAngle={Math.PI / 6} // Allow more vertical viewing angle
      maxPolarAngle={Math.PI / 2}
      // Restrict rotation to prevent seeing the back of cards
      maxAzimuthAngle={Math.PI / 2}
      minAzimuthAngle={-Math.PI / 2}
    />
  );
};
