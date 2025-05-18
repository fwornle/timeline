import React from 'react';
import { Line, Text } from '@react-three/drei';

interface TimelineAxisProps {
  length?: number;
  tickInterval?: number;
  color?: string;
  showLabels?: boolean;
  startDate?: Date;
  endDate?: Date;
  currentPosition?: number;
}

export const TimelineAxis: React.FC<TimelineAxisProps> = ({
  length = 100,
  tickInterval = 10,
  color = '#666666',
  showLabels = true,
  startDate,
  endDate,
  currentPosition = 0,
}) => {
  // Generate axis points - now from 0 to length instead of -length/2 to length/2
  const axisPoints = [
    [0, 0, 0] as [number, number, number],
    [0, 0, length] as [number, number, number],
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
    const normalizedPosition = position / length;

    // Calculate the timestamp at this position
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    const timeRange = endTime - startTime;
    const timestamp = startTime + (normalizedPosition * timeRange);

    return new Date(timestamp);
  };

  // Generate tick marks along the axis
  for (let i = 0; i <= length; i += tickInterval) {
    // Add tick mark
    ticks.push(
      <Line
        key={`tick-${i}`}
        points={[
          [0, -tickSize, i] as [number, number, number],
          [0, tickSize, i] as [number, number, number],
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
          position={[0, tickSize * 2, i]}
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

  // Create a marker for the current position
  const CurrentPositionMarker = () => {
    // Only show marker if we have a valid position
    if (currentPosition === undefined || currentPosition === null) {
      return null;
    }

    // Create a vertical marker at the current position
    return (
      <group position={[0, 0, currentPosition]}>
        {/* Vertical line */}
        <Line
          points={[
            [0, -1, 0] as [number, number, number],
            [0, 1, 0] as [number, number, number],
          ]}
          color="#ff9800" // Orange color for the marker
          lineWidth={3}
        />
        {/* Horizontal marker */}
        <Line
          points={[
            [-0.5, 0, 0] as [number, number, number],
            [0.5, 0, 0] as [number, number, number],
          ]}
          color="#ff9800"
          lineWidth={3}
        />
        {/* Label */}
        <Text
          position={[0, 1.2, 0]}
          color="#ff9800"
          fontSize={0.5}
          anchorX="center"
          anchorY="bottom"
          fontWeight="bold"
        >
          Current
        </Text>
      </group>
    );
  };

  return (
    <group>
      <Line
        points={axisPoints}
        color={color}
        lineWidth={1}
      />
      {ticks}
      <CurrentPositionMarker />
    </group>
  );
};
