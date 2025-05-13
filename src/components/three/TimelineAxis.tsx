import { Line } from '@react-three/drei';
import { Vector3 } from 'three';

export const TimelineAxis = () => {
  // Create points for the main axis line
  const axisPoints = [
    [0, 0, -50], // Start point
    [0, 0, 50],  // End point
  ].map(point => new Vector3(...point));

  // Create points for the axis ticks
  const tickLength = 0.5;
  const tickPoints: Vector3[][] = [];
  
  // Generate tick marks every 5 units
  for (let z = -50; z <= 50; z += 5) {
    tickPoints.push([
      new Vector3(-tickLength, 0, z),
      new Vector3(tickLength, 0, z),
    ]);
  }

  return (
    <group>
      {/* Main axis line */}
      <Line
        points={axisPoints}
        color="white"
        lineWidth={2}
      />

      {/* Tick marks */}
      {tickPoints.map((points, index) => (
        <Line
          key={index}
          points={points}
          color="white"
          lineWidth={1}
        />
      ))}
    </group>
  );
};