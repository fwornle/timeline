import React from 'react';
import { Line, Text } from '@react-three/drei';
import { DraggableTimelineMarker } from './DraggableTimelineMarker';

interface TimelineAxisProps {
  length?: number;
  tickInterval?: number;
  color?: string;
  showLabels?: boolean;
  startDate?: Date;
  endDate?: Date;
  currentPosition?: number;
  onPositionChange?: (position: number) => void;
}

export const TimelineAxis: React.FC<TimelineAxisProps> = ({
  length = 100,
  tickInterval = 10,
  color = '#666666',
  showLabels = true,
  startDate,
  endDate,
  currentPosition = 0,
  onPositionChange,
}) => {
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
        <Text
          key={`label-${i}`}
          position={[0, 2 + tickSize * 2, i]}
          color={color}
          fontSize={0.4}
          anchorX="center"
          anchorY="bottom"
        >
          {label}
        </Text>
      );
    }
  }

  // Handle marker position changes
  const handlePositionChange = (newPosition: number) => {
    if (onPositionChange) {
      onPositionChange(newPosition);
    }
  };

  // Handle click on the timeline axis to move the marker
  const handleAxisClick = (e: any) => {
    e.stopPropagation();
    if (onPositionChange) {
      // Get the clicked position along the Z axis
      // In Three.js, the event contains a point property with the intersection point
      const clickedPosition = e.point.z;

      // Limit position to timeline bounds
      const minPos = -length / 2;
      const maxPos = length / 2;
      const clampedPosition = Math.max(minPos, Math.min(maxPos, clickedPosition));

      // Update position through callback
      onPositionChange(clampedPosition);
    }
  };

  return (
    <group>
      {/* Invisible plane for click detection along the entire timeline */}
      <mesh
        position={[0, 2, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        onClick={handleAxisClick}
      >
        <planeGeometry args={[8, length]} /> {/* Wider plane for easier clicking */}
        <meshBasicMaterial visible={false} transparent={true} opacity={0} />
      </mesh>

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
          color="#ff9800"
          showLabel={true}
          labelText="Current"
        />
      )}
    </group>
  );
};
