import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Grid } from '@react-three/drei';
import { TimelineCamera } from './TimelineCamera';
import { TimelineAxis } from './TimelineAxis';
import { ViewportFilteredEvents } from './ViewportFilteredEvents';
import { TimelineDriftController } from './TimelineDriftController';
import type { TimelineEvent } from '../../data/types/TimelineEvent';
import { Vector3 } from 'three';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { clearAllCardHovers } from '../../utils/three/cardUtils';
import type { CameraState } from './TimelineCamera';
import { useLogger } from '../../utils/logging/hooks/useLogger';
import { threeColors } from '../../config';
import { calculateTimelineLength } from '../../utils/timeline/timelineCalculations';


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
  droneMode?: boolean;
  currentPosition?: number;
  onMarkerPositionChange?: (position: number) => void;
  onCameraPositionChange?: (position: Vector3) => void;
  onCameraStateChange?: (state: CameraState) => void;
  initialCameraState?: CameraState;
  debugMode?: boolean;
  disableCameraControls?: boolean;
}

export const TimelineScene: React.FC<TimelineSceneProps> = ({
  events,
  selectedCardId,
  cameraTarget,
  onCardSelect,
  onCardHover,
  onCardPositionUpdate,
  getCardAnimationProps,
  droneMode = false,
  currentPosition = 0,
  onMarkerPositionChange,
  onCameraPositionChange,
  onCameraStateChange,
  initialCameraState,
  debugMode = false,
  disableCameraControls = false
}) => {
  const logger = useLogger({ component: 'TimelineScene', topic: 'ui' });
  const [isMarkerDragging, setIsMarkerDragging] = useState(false);
  const [isTimelineHovering, setIsTimelineHovering] = useState(false);

  // Handle timeline hover state changes
  const handleTimelineHoverChange = useCallback((isHovering: boolean) => {
    setIsTimelineHovering(isHovering);

    // When timeline hover starts, close all cards
    if (isHovering) {
      onCardHover(null); // Close all cards
    }
  }, [onCardHover]);

  // Log camera callback props
  useEffect(() => {
    if (debugMode) {
      logger.debug('TimelineScene camera callbacks:', {
        hasOnCameraPositionChange: !!onCameraPositionChange,
        hasOnCameraStateChange: !!onCameraStateChange,
        hasInitialCameraState: !!initialCameraState
      });
    } else {
      logger.debug('TimelineScene camera callbacks:', {
        hasOnCameraPositionChange: !!onCameraPositionChange,
        hasOnCameraStateChange: !!onCameraStateChange,
        hasInitialCameraState: !!initialCameraState,
        debugMode
      });
    }
  }, [onCameraPositionChange, onCameraStateChange, initialCameraState, debugMode, logger]);

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

  // Use centralized timeline length calculation
  const timelineLength = useMemo(() => {
    return calculateTimelineLength(events.length);
  }, [events]);

  // Debug logging for Grid component
  useEffect(() => {
    logger.debug('🔷 TimelineScene rendering with Grid component', {
      eventsCount: events.length,
      timelineLength,
      debugMode,
      startDate,
      endDate
    });
  }, [events.length, timelineLength, debugMode, logger]);

  // Background click handler component - simplified to only handle document clicks outside canvas
  const BackgroundClickHandler: React.FC<{
    onCardSelect: (id: string | null) => void;
    onCardHover: (id: string | null) => void;
  }> = ({ onCardSelect, onCardHover }) => {
    const { gl } = useThree();

    useEffect(() => {
      // Only handle document clicks that are OUTSIDE the canvas
      const handleDocumentClick = (event: MouseEvent) => {
        const canvas = gl.domElement;
        // Only clear selections if the click was OUTSIDE the canvas
        if (!canvas.contains(event.target as Node)) {
          onCardSelect(null);
          onCardHover(null);
          clearAllCardHovers();
        }
      };

      document.addEventListener('click', handleDocumentClick);

      return () => {
        document.removeEventListener('click', handleDocumentClick);
      };
    }, [gl, onCardSelect, onCardHover]);

    return null;
  };


  return (
    <div className="w-full h-full" style={{ height: '100%' }}>
      {/* Timeline drift animation controller */}
      <TimelineDriftController />
      
      <Canvas
        shadows
        camera={{ position: [-35, 30, -50], fov: 45 }}
        style={{ background: 'linear-gradient(to bottom, #0f172a, #1e293b)', height: '100%' }}
        onWheel={() => {
          // Wheel events are handled by OrbitControls
          // Removed debug logging to reduce console spam
        }}
      >
        {/* Background click handler */}
        <BackgroundClickHandler onCardSelect={onCardSelect} onCardHover={onCardHover} />

        {/* Large invisible mesh to catch background clicks - positioned behind everything */}
        <mesh
          position={[0, 0, 0]}
          renderOrder={-1000}
          onClick={(e) => {
            e.stopPropagation();
            // Clear all selections and hovers when clicking background (outside interactive elements)
            logger.debug('Background click detected - closing all cards');
            onCardSelect(null);
            onCardHover(null);
            clearAllCardHovers();
          }}
        >
          <boxGeometry args={[1000, 1000, 1000]} />
          <meshBasicMaterial visible={false} transparent={true} opacity={0} />
        </mesh>

        {/* Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize={2048}
        />
        <pointLight position={[-10, 0, -20]} intensity={0.5} color={threeColors.visualization.pointLight1} />
        <pointLight position={[0, -10, 0]} intensity={0.5} color={threeColors.visualization.pointLight2} />

        {/* Core Components */}
        <TimelineCamera
          target={cameraTarget}
          events={events}
          onCameraPositionChange={onCameraPositionChange}
          onCameraStateChange={onCameraStateChange}
          disableControls={disableCameraControls || isMarkerDragging}
        />
        <TimelineAxis
          startDate={startDate}
          endDate={endDate}
          length={timelineLength}
          tickInterval={Math.max(5, timelineLength / 20)}
          color="#aaaaaa"
          currentPosition={currentPosition}
          onPositionChange={onMarkerPositionChange}
          onMarkerDragStateChange={(isDragging) => {
            setIsMarkerDragging(isDragging);
          }}
          onTimelineHoverChange={handleTimelineHoverChange}
          droneMode={droneMode}
          eventCount={events.length}
          showHolidays={true}
        />
        <ViewportFilteredEvents
          events={events}
          selectedCardId={selectedCardId}
          onSelect={onCardSelect}
          onHover={onCardHover}
          onPositionUpdate={onCardPositionUpdate}
          getAnimationProps={getCardAnimationProps}
          currentPosition={currentPosition}
          isMarkerDragging={isMarkerDragging}
          isTimelineHovering={isTimelineHovering}
          droneMode={droneMode}
          cameraTarget={cameraTarget}
          debugMode={debugMode}
        />

        {/* Environment & Helpers */}
        <Grid
          args={[100, 100]}
          cellSize={1}
          sectionSize={5}
          fadeStrength={1.5}
          fadeDistance={100}
          position={[0, -0.01, 0]}
          infiniteGrid={true}
          followCamera={false}
          onUpdate={() => {}}
        />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};
