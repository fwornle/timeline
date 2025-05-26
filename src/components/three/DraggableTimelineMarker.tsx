import React, { useRef, useState, useEffect } from 'react';
import { Line } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Group, Vector3, Vector2, Raycaster } from 'three';
import { threeColors } from '../../config';
import { SafeText } from './SafeText';

interface DraggableTimelineMarkerProps {
  position: number;
  onPositionChange: (position: number) => void;
  timelineLength: number;
  color?: string;
  showLabel?: boolean;
  labelText?: string;
  onDragStateChange?: (isDragging: boolean) => void;
}

export const DraggableTimelineMarker: React.FC<DraggableTimelineMarkerProps> = ({
  position,
  onPositionChange,
  timelineLength,
  color = threeColors.warning,
  showLabel = true,
  labelText = 'Current',
  onDragStateChange,
}) => {
  const { camera, gl } = useThree();
  const markerRef = useRef<Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const raycasterRef = useRef(new Raycaster());
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

    // Cast a ray from the camera through the mouse position
    raycasterRef.current.setFromCamera(new Vector2(mouseX, mouseY), camera);

    // Define the timeline axis as a line along the Z-axis at Y=2
    const timelineStart = new Vector3(0, 2, -timelineLength / 2);
    const timelineDirection = new Vector3(0, 0, 1); // Z-axis direction

    // Find the closest point on the timeline axis to the ray
    const rayOrigin = raycasterRef.current.ray.origin;
    const rayDirection = raycasterRef.current.ray.direction;

    // Calculate the closest point on the timeline axis to the ray
    // Using the formula for closest point between two lines in 3D
    const w0 = rayOrigin.clone().sub(timelineStart);
    const a = rayDirection.dot(rayDirection);
    const b = rayDirection.dot(timelineDirection);
    const c = timelineDirection.dot(timelineDirection);
    const d = rayDirection.dot(w0);
    const dotE = timelineDirection.dot(w0);

    const denominator = a * c - b * b;
    let t = 0; // Parameter along timeline axis

    if (Math.abs(denominator) > 1e-6) {
      // Lines are not parallel
      t = (a * dotE - b * d) / denominator;
    } else {
      // Lines are parallel, use projection
      t = dotE / c;
    }

    // Calculate the position on the timeline axis
    const closestPoint = timelineStart.clone().add(timelineDirection.clone().multiplyScalar(t));
    const newPosition = closestPoint.z;

    // Limit position to timeline bounds
    const minPos = -timelineLength / 2;
    const maxPos = timelineLength / 2;
    const clampedPosition = Math.max(minPos, Math.min(maxPos, newPosition));

    // Update position through callback
    onPositionChange(clampedPosition);
  };

  const handleGlobalPointerUp = () => {
    if (!isDragging) return;

    // End dragging state
    setIsDragging(false);
    document.body.style.cursor = 'auto';

    // Notify parent that dragging ended
    if (onDragStateChange) {
      onDragStateChange(false);
    }
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
    // Only stop propagation and start dragging if the click is directly on the marker
    // This allows timeline clicks to work when clicking away from the marker
    e.stopPropagation();

    // Set dragging state
    setIsDragging(true);

    // Notify parent that dragging started
    if (onDragStateChange) {
      onDragStateChange(true);
    }

    // Set the cursor style to indicate dragging
    document.body.style.cursor = 'ew-resize';

    // Store initial position for reference
    initialPositionRef.current = position;
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
        {/* Smaller plane to reduce interference with timeline clicks */}
        <planeGeometry args={[2, 2]} />
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

      {/* Vertical line - shortened to not pierce through timeline catch zone surface */}
      <Line
        points={[
          [0, -0.3, 0] as [number, number, number], // Stop above Y=1.5 (catch zone surface at Y=1.5, marker at Y=2, so -0.3 relative = Y=1.7)
          [0, 1, 0] as [number, number, number],    // Extend upward as before
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
        <SafeText
          position={[0, 1.2, 0]}
          color={color}
          fontSize={0.5}
          anchorX="center"
          anchorY="bottom"
        >
          {labelText}
        </SafeText>
      )}
    </group>
  );
};
