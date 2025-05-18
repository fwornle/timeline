import React from 'react';
import { Line, Text } from '@react-three/drei';

interface TimelineAxisProps {
  length?: number;
  tickInterval?: number;
  color?: string;
  showLabels?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export const TimelineAxis: React.FC<TimelineAxisProps> = ({
  length = 100,
  tickInterval = 10,
  color = '#666666',
  showLabels = true,
  startDate,
  endDate,
}) => {
  // Generate axis points
  const axisPoints = [
    [0, 0, -length / 2] as [number, number, number],
    [0, 0, length / 2] as [number, number, number],
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
    const axisLength = length;
    const normalizedPosition = (position + axisLength / 2) / axisLength;

    // Calculate the timestamp at this position
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    const timeRange = endTime - startTime;
    const timestamp = startTime + (normalizedPosition * timeRange);

    return new Date(timestamp);
  };

  for (let i = -length / 2; i <= length / 2; i += tickInterval) {
    // Skip the center point (0)
    if (Math.abs(i) < 0.001) continue;

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
      const label = date ? formatDate(date) : (i > 0 ? `+${i}` : `${i}`);

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

  return (
    <group>
      <Line
        points={axisPoints}
        color={color}
        lineWidth={1}
      />
      {ticks}
    </group>
  );
};
