import React from 'react';
import { Line, Text } from '@react-three/drei';

interface TimelineAxisProps {
  length?: number;
  tickInterval?: number;
  color?: string;
  showLabels?: boolean;
}

export const TimelineAxis: React.FC<TimelineAxisProps> = ({
  length = 100,
  tickInterval = 10,
  color = '#666666',
  showLabels = true,
}) => {
  // Generate axis points
  const axisPoints = [
    [0, 0, -length / 2],
    [0, 0, length / 2],
  ];

  // Generate tick marks
  const ticks = [];
  const tickSize = 0.5;

  for (let i = -length / 2; i <= length / 2; i += tickInterval) {
    // Skip the center point (0)
    if (Math.abs(i) < 0.001) continue;

    // Add tick mark
    ticks.push(
      <Line
        key={`tick-${i}`}
        points={[
          [0, -tickSize, i],
          [0, tickSize, i],
        ]}
        color={color}
        lineWidth={1}
      />
    );

    // Add label if enabled
    if (showLabels) {
      ticks.push(
        <Text
          key={`label-${i}`}
          position={[0, tickSize * 2, i]}
          color={color}
          fontSize={0.5}
          anchorX="center"
          anchorY="bottom"
        >
          {i > 0 ? `+${i}` : i}
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
