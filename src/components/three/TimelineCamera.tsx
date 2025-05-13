import { OrbitControls } from '@react-three/drei';
import type { Vector3 } from 'three';
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

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
    />
  );
};