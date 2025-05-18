import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Grid } from '@react-three/drei';
import { TimelineCamera } from './TimelineCamera';
import { TimelineAxis } from './TimelineAxis';
import { TimelineEvents } from './TimelineEvents';
import type { TimelineEvent } from '../../data/types/TimelineEvent';
import type { Vector3 } from 'three';
import { useCallback, useEffect } from 'react';

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
  viewAllMode?: boolean;
  focusCurrentMode?: boolean;
  currentPosition?: number;
  debugMode?: boolean;
}

export const TimelineScene: React.FC<TimelineSceneProps> = ({
  events,
  selectedCardId,
  cameraTarget,
  onCardSelect,
  onCardHover,
  onCardPositionUpdate,
  getCardAnimationProps,
  viewAllMode = false,
  focusCurrentMode = false,
  currentPosition = 0,
  debugMode = false
}) => {
  // Calculate the date range from events
  const getDateRange = (): { startDate: Date | undefined, endDate: Date | undefined } => {
    if (events.length === 0) {
      return { startDate: undefined, endDate: undefined };
    }

    // Sort events by timestamp
    const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Get the earliest and latest dates
    const startDate = sortedEvents[0].timestamp;
    const endDate = sortedEvents[sortedEvents.length - 1].timestamp;

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  // Background click handler component
  const BackgroundClickHandler = useCallback(() => {
    const { gl } = useThree();

    // Add a click handler to the canvas
    useEffect(() => {
      const handleCanvasClick = (event: MouseEvent) => {
        // Only handle direct clicks on the canvas (not on cards)
        if (event.target === gl.domElement) {
          // Deselect any selected card
          onCardSelect(null);
        }
      };

      // Add event listener to the canvas
      gl.domElement.addEventListener('click', handleCanvasClick);

      // Clean up
      return () => {
        gl.domElement.removeEventListener('click', handleCanvasClick);
      };
    }, [gl, onCardSelect]);

    return null;
  }, [onCardSelect]);

  return (
    <div className="w-full h-full" style={{ height: '100%' }}>
      <Canvas
        shadows
        camera={{ position: [10, 10, 10], fov: 45 }}
        style={{ background: 'linear-gradient(to bottom, #0f172a, #1e293b)', height: '100%' }}
      >
        {/* Background click handler */}
        <BackgroundClickHandler />

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
        <TimelineCamera
          target={cameraTarget}
          viewAllMode={viewAllMode}
          focusCurrentMode={focusCurrentMode}
          events={events}
          debugMode={debugMode}
        />
        <TimelineAxis
          startDate={startDate}
          endDate={endDate}
          tickInterval={5}
          color="#aaaaaa"
          currentPosition={currentPosition}
        />
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
