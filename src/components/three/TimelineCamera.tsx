import { useRef, useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Vector3 } from 'three';

interface TimelineCameraProps {
  target: Vector3;
}

export const TimelineCamera: React.FC<TimelineCameraProps> = ({ target }) => {
  const controlsRef = useRef(null);
  const { camera } = useThree();

  useEffect(() => {
    if (controlsRef.current) {
      const controls = controlsRef.current as { target: Vector3 };
      controls.target.copy(target);

      // Ensure camera is positioned to look at the front of cards
      // We want to be looking at the cards from a position with negative Z
      // This ensures we're always looking at the front face
      const cameraOffset = new Vector3(-10, 10, -10);
      camera.position.copy(target).add(cameraOffset);
      camera.lookAt(target);
    }
  }, [target, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={5}
      maxDistance={100}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 2}
      // Restrict rotation to prevent seeing the back of cards
      maxAzimuthAngle={Math.PI / 2}
      minAzimuthAngle={-Math.PI / 2}
    />
  );
};
