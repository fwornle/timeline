import { useEffect, useState, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useLogger } from '../../utils/logging/hooks/useLogger';
import type { TimelineEvent } from '../../data/types/TimelineEvent';

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
    const timelineLength = Math.max(events.length * spacing, 100);

    // Position camera to see the entire timeline
    // We want to be far enough back to see all events
    const distance = Math.max(30, timelineLength * 0.8);

    // Position camera at an angle to see the timeline from the side
    return new Vector3(
      -distance,        // Position to the left
      distance * 0.7,   // Position above proportional to the distance
      timelineLength * 0.5  // Position at the middle of the timeline
    );
  }

  // Fallback for when we don't have events or can't calculate bounds
  return new Vector3(
    -30, // Position to the left
    30,  // Position above
    50   // Position at a reasonable distance along timeline
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
}) => {
  const { camera } = useThree();
  const [initialPositionSet, setInitialPositionSet] = useState(false);
  const logger = useLogger({ component: 'TimelineCamera', topic: 'ui' });
  const lastViewModeRef = useRef({ viewAll: false, focusCurrent: false });
  const userControlledRef = useRef(false);

  // Handle initial camera setup - only once
  useEffect(() => {
    if (initialPositionSet) return;

    // Position camera to show the start of the timeline
    // We want to be closer to the timeline and higher up for a better view
    const initialDistance = 25;
    const initialPosition = new Vector3(
      -initialDistance * 0.5,  // Closer to the timeline horizontally
      initialDistance * 0.8,   // Higher up for better overview
      -initialDistance * 0.3   // Slightly behind the start for better perspective
    );

    camera.position.copy(initialPosition);
    // Look at a point slightly ahead of the start to show the direction
    camera.lookAt(new Vector3(0, 0, 10));

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

  return (
    <OrbitControls
      makeDefault
      target={target}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={5}
      maxDistance={100}
      minPolarAngle={Math.PI / 4}  // Increased minimum angle to prevent too low views
      maxPolarAngle={Math.PI * 0.6} // Allow slightly higher views
      // Restrict rotation to prevent seeing the back of cards
      maxAzimuthAngle={Math.PI * 0.3}  // Allow less rotation to the right
      minAzimuthAngle={-Math.PI * 0.4}  // Allow more rotation to the left
      onChange={() => {
        userControlledRef.current = true;
      }}
    />
  );
};
