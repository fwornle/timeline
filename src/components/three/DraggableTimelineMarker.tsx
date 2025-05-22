import React, { useRef, useState, useEffect } from 'react';
import { Line, Text } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Vector3, Vector2, Raycaster, Plane, Group } from 'three';

interface DraggableTimelineMarkerProps {
  position: number;
  onPositionChange: (position: number) => void;
  timelineLength: number;
  color?: string;
  showLabel?: boolean;
  labelText?: string;
}

export const DraggableTimelineMarker: React.FC<DraggableTimelineMarkerProps> = ({
  position,
  onPositionChange,
  timelineLength,
  color = '#ff9800',
  showLabel = true,
  labelText = 'Current',
}) => {
  const { camera, gl } = useThree();
  const markerRef = useRef<Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragPlaneRef = useRef(new Plane(new Vector3(0, 0, 1), 0));
  const raycasterRef = useRef(new Raycaster());
  const dragStartPointRef = useRef<Vector3 | null>(null);
  const initialPositionRef = useRef<number>(position);

  // Update the marker position when the prop changes from outside
  useEffect(() => {
    if (!isDragging && initialPositionRef.current !== position) {
      initialPositionRef.current = position;
    }
  }, [position, isDragging]);

  // Global pointer move handler for when dragging
  const handleGlobalPointerMove = (e: PointerEvent) => {
    if (!isDragging) return;

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const rect = gl.domElement.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Update the raycaster with the mouse position and camera
    raycasterRef.current.setFromCamera(new Vector2(mouseX, mouseY), camera);

    // Find the intersection point with the drag plane
    const intersectionPoint = new Vector3();
    if (raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, intersectionPoint)) {
      // Constrain movement to the Z axis only
      const newPosition = intersectionPoint.z;

      // Limit position to timeline bounds
      const minPos = -timelineLength / 2;
      const maxPos = timelineLength / 2;
      const clampedPosition = Math.max(minPos, Math.min(maxPos, newPosition));

      // Update position through callback
      onPositionChange(clampedPosition);
    }
  };

  const handleGlobalPointerUp = () => {
    if (!isDragging) return;

    // End dragging state
    setIsDragging(false);
    document.body.style.cursor = 'auto';
    dragStartPointRef.current = null;
  };

  // Add global event listeners when dragging starts
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('pointermove', handleGlobalPointerMove);
      document.addEventListener('pointerup', handleGlobalPointerUp);
      document.addEventListener('pointercancel', handleGlobalPointerUp);
      document.body.style.cursor = 'ew-resize'; // Use east-west cursor to indicate horizontal dragging

      return () => {
        document.removeEventListener('pointermove', handleGlobalPointerMove);
        document.removeEventListener('pointerup', handleGlobalPointerUp);
        document.removeEventListener('pointercancel', handleGlobalPointerUp);
        document.body.style.cursor = 'auto';
      };
    }
  }, [isDragging, camera, gl.domElement, timelineLength, onPositionChange]);

  // Handle pointer down event to start dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();

    // Set dragging state
    setIsDragging(true);
    
    // Set the cursor style to indicate dragging
    document.body.style.cursor = 'ew-resize';

    // Store initial position for reference
    initialPositionRef.current = position;

    // Create a drag plane aligned with the timeline (XY plane at the marker position)
    // The normal of the plane should be perpendicular to the camera's view but aligned with the Z axis
    // So we use the Z axis as the normal
    const normal = new Vector3(0, 0, 1);
    dragPlaneRef.current.setFromNormalAndCoplanarPoint(
      normal,
      new Vector3(0, 2, position)
    );

    // Store the point where dragging started
    dragStartPointRef.current = new Vector3(0, 2, position);
  };

  // Create a marker for the current position
  return (
    <group
      ref={markerRef}
      position={[0, 2, position]}
      onPointerDown={handlePointerDown}
    >
      {/* Transparent vertical plane - stands up perpendicular to the time axis (Z) */}
      <mesh
        rotation={[0, 0, 0]}
        position={[0, 0, 0]}
        onPointerDown={handlePointerDown}
      >
        {/* Plane is perpendicular to Z (time axis), covers the timeline height */}
        <planeGeometry args={[4, 2]} />
        {/* Custom shader material for edge fade */}
        <shaderMaterial
          attach="material"
          transparent
          uniforms={{
            color: { value: [
              parseInt(color.slice(1, 3), 16) / 255,
              parseInt(color.slice(3, 5), 16) / 255,
              parseInt(color.slice(5, 7), 16) / 255
            ] },
            opacity: { value: isDragging ? 0.9 : 0.7 }, // More opaque when dragging
            fade: { value: isDragging ? 0.9 : 0.7 }, // Less fade when dragging
          }}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 color;
            uniform float opacity;
            uniform float fade;
            varying vec2 vUv;
            void main() {
              float edgeFade = smoothstep(0.0, fade, vUv.x) * smoothstep(0.0, fade, 1.0 - vUv.x)
                              * smoothstep(0.0, fade, vUv.y) * smoothstep(0.0, fade, 1.0 - vUv.y);
              gl_FragColor = vec4(color, opacity * edgeFade);
            }
          `}
        />
      </mesh>

      {/* Vertical line */}
      <Line
        points={[
          [0, -1, 0] as [number, number, number],
          [0, 1, 0] as [number, number, number],
        ]}
        color={color}
        lineWidth={isDragging ? 4 : 3} // Thicker when dragging
      />

      {/* Horizontal marker */}
      <Line
        points={[
          [-0.5, 0, 0] as [number, number, number],
          [0.5, 0, 0] as [number, number, number],
        ]}
        color={color}
        lineWidth={isDragging ? 4 : 3} // Thicker when dragging
      />

      {/* Label */}
      {showLabel && (
        <Text
          position={[0, 1.2, 0]}
          color={color}
          fontSize={0.5}
          anchorX="center"
          anchorY="bottom"
          fontWeight="bold"
        >
          {labelText}
        </Text>
      )}
    </group>
  );
};
