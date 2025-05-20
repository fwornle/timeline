import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Grid } from '@react-three/drei';
import { TimelineCamera } from './TimelineCamera';
import { TimelineAxis } from './TimelineAxis';
import { TimelineEvents } from './TimelineEvents';
import type { TimelineEvent } from '../../data/types/TimelineEvent';
import { Vector3 } from 'three';
import { useEffect, useMemo } from 'react';
import { clearAllCardHovers } from './TimelineCard';

export interface TimelineSceneProps {
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
  onMarkerPositionChange?: (position: number) => void;
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
  onMarkerPositionChange,
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

  // Calculate timelineLength based on events (consistent with TimelineEvents.tsx)
  const timelineLength = useMemo(() => {
    if (events.length === 0) return 100; // Default length if no events
    const minSpacing = 5;
    return Math.max(events.length * minSpacing, 100);
  }, [events]);

  // Background click handler component
  const BackgroundClickHandler: React.FC<{ onCardSelect: (id: string | null) => void }> = ({ onCardSelect }) => {
    const { gl } = useThree();

    useEffect(() => {
      const handleCanvasClick = (event: MouseEvent) => {
        // Only handle direct clicks on the canvas (not on cards)
        if (event.target === gl.domElement) {
          // Deselect any selected card
          onCardSelect(null);
          // Also clear all card hovers
          clearAllCardHovers();
        }
      };

      gl.domElement.addEventListener('click', handleCanvasClick);
      return () => {
        gl.domElement.removeEventListener('click', handleCanvasClick);
      };
    }, [gl, onCardSelect]);

    return null;
  };

  return (
    <div className="w-full h-full" style={{ height: '100%' }}>
      <Canvas
        shadows
        camera={{ position: [12, 8, 0], fov: 45 }}
        style={{ background: 'linear-gradient(to bottom, #0f172a, #1e293b)', height: '100%' }}
      >
        {/* Background click handler */}
        <BackgroundClickHandler onCardSelect={onCardSelect} />

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
          length={timelineLength}
          tickInterval={Math.max(5, timelineLength / 20)}
          color="#aaaaaa"
          currentPosition={currentPosition}
          onPositionChange={onMarkerPositionChange}
        />
        <TimelineEvents
          events={events}
          selectedCardId={selectedCardId}
          onSelect={onCardSelect}
          onHover={onCardHover}
          onPositionUpdate={onCardPositionUpdate}
          getAnimationProps={getCardAnimationProps}
          currentPosition={currentPosition}
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
