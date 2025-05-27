import React, { useState, useMemo, useRef } from 'react';
import { Line } from '@react-three/drei';
import { DraggableTimelineMarker } from './DraggableTimelineMarker';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { threeColors } from '../../config';
import { SafeText } from './SafeText';
import { Logger } from '../../utils/logging/Logger';

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

  // Check if debug visualization should be shown (DEBUG or TRACE level active)
  // Note: This will be checked on each render, which is fine for this use case
  const showDebugPlanes = (() => {
    const activeLevels = Logger.getActiveLevels();
    return activeLevels.has(Logger.Levels.DEBUG) || activeLevels.has(Logger.Levels.TRACE);
  })();

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
      {/* Wide invisible plane for hover-off detection - MUST be on top to receive events */}
      <mesh
        position={[0, 2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1001} // HIGHEST render order to receive all pointer events
        onClick={handleAxisClick}
        onPointerEnter={(e) => {
          Logger.debug(Logger.Categories.THREE, 'Pointer entered wide plane');

          // Disable timeline hover during drone mode
          if (droneMode) {
            Logger.debug(Logger.Categories.THREE, 'Drone mode active, ignoring hover');
            return;
          }

          // Update mouse tracking
          updateMouseTracking(e.nativeEvent.clientX, e.nativeEvent.clientY);

          // Check if we're in the narrow corridor (center 4 units of the 24-unit wide plane)
          const localX = e.point.x; // X position relative to plane center
          const isInNarrowCorridor = Math.abs(localX) <= 2; // 4 units wide = ±2 from center

          Logger.debug(Logger.Categories.THREE, 'Timeline hover detection', {
            localX,
            isInNarrowCorridor,
            hasMovedSignificantly: mouseTrackingRef.current.hasMovedSignificantly
          });

          // Only trigger timeline hover if mouse has moved significantly AND we're in narrow corridor
          if (mouseTrackingRef.current.hasMovedSignificantly && isInNarrowCorridor) {
            Logger.debug(Logger.Categories.THREE, 'Setting isHovering to true');
            setIsHovering(true);
            // Notify parent about timeline hover state change
            if (onTimelineHoverChange) {
              onTimelineHoverChange(true);
            }
          }
        }}
        onPointerMove={(e) => {
          // Always handle pointer move for pin tracking
          if (isHovering) {
            handlePointerMove(e);
          } else {
            // Check if we should start hovering (entered narrow corridor)
            if (!droneMode) {
              updateMouseTracking(e.nativeEvent.clientX, e.nativeEvent.clientY);
              const localX = e.point.x;
              const isInNarrowCorridor = Math.abs(localX) <= 2;

              Logger.debug(Logger.Categories.THREE, 'Timeline pointer move detection', {
                localX,
                isInNarrowCorridor,
                hasMovedSignificantly: mouseTrackingRef.current.hasMovedSignificantly
              });

              if (mouseTrackingRef.current.hasMovedSignificantly && isInNarrowCorridor) {
                Logger.debug(Logger.Categories.THREE, 'Starting hover from onPointerMove');
                setIsHovering(true);
                if (onTimelineHoverChange) {
                  onTimelineHoverChange(true);
                }
                handlePointerMove(e);
              }
            }
          }
        }}
        onPointerLeave={() => {
          // ALWAYS remove the pin when leaving the wide corridor
          Logger.debug(Logger.Categories.THREE, 'Leaving wide corridor - removing pin');
          setIsHovering(false);
          setHoverPosition(null);
          // Notify parent about timeline hover state change
          if (onTimelineHoverChange) {
            onTimelineHoverChange(false);
          }
        }}
      >
        <planeGeometry args={[24, length]} /> {/* Wide plane for hover-off detection */}
        <meshBasicMaterial
          color="red"
          transparent={true}
          opacity={showDebugPlanes ? 0.2 : 0}
          visible={showDebugPlanes}
        />
      </mesh>

      {/* Narrow visible plane for visual feedback */}
      <mesh
        position={[0, 2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1000} // Below the wide plane
      >
        <planeGeometry args={[4, length]} /> {/* Narrow plane for visual feedback */}
        <meshBasicMaterial
          color="blue"
          transparent={true}
          opacity={showDebugPlanes ? 0.3 : 0}
          visible={showDebugPlanes}
        />
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
