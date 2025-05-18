import { useRef, useEffect, useState } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Vector3 } from 'three';

interface TimelineCameraProps {
  target: Vector3;
  viewAllMode?: boolean;
  focusCurrentMode?: boolean;
}

// Calculate a position that shows the timeline from bottom left with newest data at bottom left
const calculateViewAllPosition = (target: Vector3): Vector3 => {
  // Position camera to view from bottom left corner
  // This creates the view where the timeline extends up and to the right
  return new Vector3(
    target.x - 25, // Position to the left
    20,           // Position above
    target.z + 25  // Position behind (newer data at bottom left)
  );
};

// Calculate a position that focuses on the current time point
const calculateFocusPosition = (target: Vector3): Vector3 => {
  // Position camera closer to the target for a focused view
  return new Vector3(
    target.x - 10, // Position to the left
    10,           // Position above
    target.z + 10  // Position behind
  );
};

export const TimelineCamera: React.FC<TimelineCameraProps> = ({
  target,
  viewAllMode = false,
  focusCurrentMode = false
}) => {
  const controlsRef = useRef(null);
  const { camera } = useThree();
  const [initialPositionSet, setInitialPositionSet] = useState(false);

  useEffect(() => {
    if (controlsRef.current) {
      const controls = controlsRef.current as { target: Vector3 };
      controls.target.copy(target);

      // Determine which camera position to use
      let cameraPosition: Vector3;

      if (viewAllMode) {
        // View all events
        cameraPosition = calculateViewAllPosition(target);
      } else if (focusCurrentMode) {
        // Focus on current time point
        cameraPosition = calculateFocusPosition(target);
      } else if (!initialPositionSet) {
        // Initial position - set only once
        cameraPosition = calculateViewAllPosition(target);
        setInitialPositionSet(true);
      } else {
        // Default behavior - maintain relative position
        const cameraOffset = new Vector3(-15, 15, 15);
        cameraPosition = target.clone().add(cameraOffset);
      }

      camera.position.copy(cameraPosition);
      camera.lookAt(target);
    }
  }, [target, camera, viewAllMode, focusCurrentMode, initialPositionSet]);

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
