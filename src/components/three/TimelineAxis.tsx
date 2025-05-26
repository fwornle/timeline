import React, { useState, useMemo, useRef } from 'react';
import { Line } from '@react-three/drei';
import { DraggableTimelineMarker } from './DraggableTimelineMarker';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { threeColors } from '../../config';
import { SafeText } from './SafeText';

interface TimelineAxisProps {
  length?: number;
  tickInterval?: number;
  color?: string;
  showLabels?: boolean;
  startDate?: Date;
  endDate?: Date;
  currentPosition?: number;
  onPositionChange?: (position: number) => void;
  onMarkerDragStateChange?: (isDragging: boolean) => void;
  onTimelineHoverChange?: (isHovering: boolean) => void;
  droneMode?: boolean;
}

export const TimelineAxis: React.FC<TimelineAxisProps> = ({
  length = 100,
  tickInterval = 10,
  color = threeColors.visualization.axis,
  showLabels = true,
  startDate,
  endDate,
  currentPosition = 0,
  onPositionChange,
  onMarkerDragStateChange,
  onTimelineHoverChange,
  droneMode = false,
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);

  // Track mouse movement to prevent accidental timeline triggers
  const mouseTrackingRef = useRef({
    lastX: 0,
    lastY: 0,
    lastMoveTime: 0,
    hasMovedSignificantly: false,
    moveThreshold: 3, // pixels
    timeThreshold: 50, // ms
  });

  // Update mouse tracking
  const updateMouseTracking = (clientX: number, clientY: number) => {
    const now = performance.now();
    const tracking = mouseTrackingRef.current;

    const deltaX = Math.abs(clientX - tracking.lastX);
    const deltaY = Math.abs(clientY - tracking.lastY);
    const deltaTime = now - tracking.lastMoveTime;

    // Check if mouse has moved significantly
    if (deltaX > tracking.moveThreshold || deltaY > tracking.moveThreshold) {
      tracking.hasMovedSignificantly = true;
    }

    // Reset if enough time has passed without significant movement
    if (deltaTime > tracking.timeThreshold && deltaX <= tracking.moveThreshold && deltaY <= tracking.moveThreshold) {
      tracking.hasMovedSignificantly = false;
    }

    tracking.lastX = clientX;
    tracking.lastY = clientY;
    tracking.lastMoveTime = now;
  };

  // Generate axis points - centered around z=0
  const axisPoints = [
    [0, 2, -length / 2] as [number, number, number],
    [0, 2, length / 2] as [number, number, number],
  ];

  // Generate tick marks
  const ticks = [];
  const tickSize = 0.5;

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Map position to date if start and end dates are provided
  const positionToDate = (position: number): Date | null => {
    if (!startDate || !endDate) return null;

    // Calculate the percentage of the position along the axis
    // Map from [-length/2, length/2] to [0, 1]
    const normalizedPosition = (position + length / 2) / length;

    // Calculate the timestamp at this position
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    const timeRange = endTime - startTime;
    const timestamp = startTime + (normalizedPosition * timeRange);

    return new Date(timestamp);
  };

  // Generate tick marks along the axis
  for (let i = -length / 2; i <= length / 2; i += tickInterval) {
    // Add tick mark
    ticks.push(
      <Line
        key={`tick-${i}`}
        points={[
          [0, 2 - tickSize, i] as [number, number, number],
          [0, 2 + tickSize, i] as [number, number, number],
        ]}
        color={color}
        lineWidth={1}
      />
    );

    // Add label if enabled
    if (showLabels) {
      // Get date for this position if possible
      const date = positionToDate(i);
      const label = date ? formatDate(date) : `${i}`;

      ticks.push(
        <SafeText
          key={`label-${i}`}
          position={[0, 2 + tickSize * 2, i]}
          color={color}
          fontSize={0.4}
          anchorX="center"
          anchorY="bottom"
        >
          {label}
        </SafeText>
      );
    }
  }

  // Handle marker position changes
  const handlePositionChange = (newPosition: number) => {
    if (onPositionChange) {
      onPositionChange(newPosition);
    }
  };

  // Handle pointer move over the timeline to show a hover indicator
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    // Disable timeline hover during drone mode
    if (droneMode) {
      return;
    }

    // Update mouse tracking
    updateMouseTracking(e.nativeEvent.clientX, e.nativeEvent.clientY);

    // Get the hovered position along the Z axis (timeline runs along Z)
    const hoveredPosition = e.point.z;

    // Limit position to timeline bounds
    const minPos = -length / 2;
    const maxPos = length / 2;
    const clampedPosition = Math.max(minPos, Math.min(maxPos, hoveredPosition));

    // Update hover position
    setHoverPosition(clampedPosition);
  };

  // Handle click on the timeline axis to move the marker
  const handleAxisClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    // Always allow marker movement when clicking on the timeline
    // The yellow pin should be showing when hovering, but we also want to handle
    // cases where the hover state might not be properly set
    if (onPositionChange) {
      // Get the clicked position along the Z axis (timeline runs along Z)
      const clickedPosition = e.point.z;

      // Limit position to timeline bounds
      const minPos = -length / 2;
      const maxPos = length / 2;
      const clampedPosition = Math.max(minPos, Math.min(maxPos, clickedPosition));

      // Update position through callback
      onPositionChange(clampedPosition);

      // Ensure hover state is set when clicking (in case it wasn't set properly)
      if (!isHovering) {
        setIsHovering(true);
        setHoverPosition(clampedPosition);
        if (onTimelineHoverChange) {
          onTimelineHoverChange(true);
        }
      }
    }
  };

  // Create a custom shader material for fading effect
  const fadingMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        color: { value: new THREE.Color(threeColors.visualization.marker.default) },
        opacity: { value: 0.03 },
        fadeWidth: { value: 6.0 }, // Width of the plane (slightly wider)
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        uniform float fadeWidth;
        varying vec2 vUv;

        void main() {
          // Calculate distance from center (0.5) along X axis
          float distFromCenter = abs(vUv.x - 0.5) * 2.0; // 0 at center, 1 at edges

          // Create smooth fade from center to edges
          float alpha = 1.0 - smoothstep(0.0, 1.0, distFromCenter);
          alpha = alpha * alpha; // Square for more dramatic fade

          gl_FragColor = vec4(color, opacity * alpha);
        }
      `
    });
  }, []);



  return (
    <group>
      {/* Invisible plane for click detection along the entire timeline */}
      <mesh
        position={[0, 1.5, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        renderOrder={1000} // Higher render order to ensure it's on top for click detection
        onClick={handleAxisClick}
        onPointerEnter={(e) => {
          // Disable timeline hover during drone mode
          if (droneMode) {
            return;
          }

          // Update mouse tracking
          updateMouseTracking(e.nativeEvent.clientX, e.nativeEvent.clientY);

          // Only trigger timeline hover if mouse has moved significantly (intentional movement)
          // This prevents accidental triggers from card animations moving the mouse over the timeline
          if (mouseTrackingRef.current.hasMovedSignificantly) {
            setIsHovering(true);
            // Notify parent about timeline hover state change
            if (onTimelineHoverChange) {
              onTimelineHoverChange(true);
            }
          }
        }}
        onPointerLeave={() => {
          setIsHovering(false);
          setHoverPosition(null);
          // Notify parent about timeline hover state change
          if (onTimelineHoverChange) {
            onTimelineHoverChange(false);
          }
        }}
        onPointerMove={handlePointerMove}
      >
        <planeGeometry args={[3, length]} /> {/* Narrower plane to avoid interfering with card hover */}
        <primitive object={fadingMaterial} />
      </mesh>

      {/* Hover indicator - line and ball */}
      {isHovering && hoverPosition !== null && (
        <group renderOrder={200}>
          {/* Hover line indicator */}
          <Line
            points={[
              [0, 2 - tickSize, hoverPosition] as [number, number, number],
              [0, 3, hoverPosition] as [number, number, number],
            ]}
            color={threeColors.warning}
            lineWidth={5}
            transparent
            opacity={0.9}
          />
          {/* Hover ball indicator */}
          <mesh position={[0, 3.5, hoverPosition]} renderOrder={201}>
            <sphereGeometry args={[0.25, 12, 12]} />
            <meshBasicMaterial
              color={threeColors.warning}
              transparent
              opacity={0.8}
            />
          </mesh>
        </group>
      )}

      <Line
        points={axisPoints}
        color={color}
        lineWidth={1}
      />
      {ticks}
      {/* Only show marker if we have a valid position */}
      {currentPosition !== undefined && currentPosition !== null && (
        <DraggableTimelineMarker
          position={currentPosition}
          onPositionChange={handlePositionChange}
          timelineLength={length}
          color={threeColors.warning}
          showLabel={true}
          labelText="Current"
          onDragStateChange={onMarkerDragStateChange}
        />
      )}
    </group>
  );
};
