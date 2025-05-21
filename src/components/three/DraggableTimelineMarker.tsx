import React, { useRef, useState } from 'react';
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

  // Handle pointer down event to start dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();

    // Set dragging state
    setIsDragging(true);

    // Store initial position for reference
    initialPositionRef.current = position;

    // Set up the drag plane perpendicular to the camera
    const normal = new Vector3(0, 0, 1); // Z-axis is our timeline axis
    dragPlaneRef.current.setFromNormalAndCoplanarPoint(
      normal,
      new Vector3(0, 2, position) // Use current marker position
    );

    // Store the point where dragging started
    dragStartPointRef.current = new Vector3(0, 2, position);

    // Capture pointer to track movement even outside the canvas
    gl.domElement.setPointerCapture(e.pointerId);

    // Marker drag started
  };

  // Handle pointer move event during dragging
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.stopPropagation(); // Make sure to stop propagation

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const mouseX = (e.clientX / gl.domElement.clientWidth) * 2 - 1;
    const mouseY = -(e.clientY / gl.domElement.clientHeight) * 2 + 1;

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

  // Handle pointer up event to end dragging
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;

    // End dragging state
    setIsDragging(false);
    dragStartPointRef.current = null;

    // Release pointer capture
    gl.domElement.releasePointerCapture(e.pointerId);
  };

  // Create a marker for the current position
  return (
    <group
      ref={markerRef}
      position={[0, 2, position]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Transparent vertical plane - stands up perpendicular to the time axis (Z) */}
      <mesh rotation={[0, 0, 0]} position={[0, 0, 0]}>
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
