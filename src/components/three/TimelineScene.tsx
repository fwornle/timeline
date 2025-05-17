import { Canvas } from '@react-three/fiber';
import { Environment, Grid } from '@react-three/drei';
import { TimelineCamera } from './TimelineCamera';
import { TimelineAxis } from './TimelineAxis';
import { TimelineEvents } from './TimelineEvents';
import type { TimelineEvent } from '../../data/types/TimelineEvent';
import type { Vector3 } from 'three';

interface TimelineSceneProps {
  events: TimelineEvent[];
  selectedCardId: string | null;
  cameraTarget: Vector3;
  onCardSelect: (id: string | null) => void;
  onCardHover: (id: string | null) => void;
  onCardPositionUpdate: (id: string, position: Vector3) => void;
  getCardAnimationProps: (id: string) => {
    scale: 1 | 1.1 | 1.2;
    rotation: readonly [0, number, 0];
    positionY: 0 | 0.2 | 0.5;
    springConfig: {
      mass: number;
      tension: number;
      friction: number;
    };
  };
}

export const TimelineScene: React.FC<TimelineSceneProps> = ({
  events,
  selectedCardId,
  cameraTarget,
  onCardSelect,
  onCardHover,
  onCardPositionUpdate,
  getCardAnimationProps
}) => {
  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        camera={{ position: [10, 10, 10], fov: 45 }}
        style={{ background: 'linear-gradient(to bottom, #0f172a, #1e293b)' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize={2048}
        />
        <pointLight position={[-10, 0, -20]} intensity={0.5} color="#4338ca" />
        <pointLight position={[0, -10, 0]} intensity={0.5} color="#0ea5e9" />

        {/* Core Components */}
        <TimelineCamera target={cameraTarget} />
        <TimelineAxis />
        <TimelineEvents
          events={events}
          selectedCardId={selectedCardId}
          onSelect={onCardSelect}
          onHover={onCardHover}
          onPositionUpdate={onCardPositionUpdate}
          getAnimationProps={getCardAnimationProps}
        />

        {/* Environment & Helpers */}
        <Grid
          args={[100, 100]}
          cellSize={1}
          sectionSize={5}
          fadeStrength={1.5}
          fadeDistance={100}
          position={[0, -0.01, 0]}
        />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};
