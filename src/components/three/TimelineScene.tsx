import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Grid } from '@react-three/drei';
import { TimelineCamera } from './TimelineCamera';
import { TimelineAxis } from './TimelineAxis';
import { TimelineEvents } from './TimelineEvents';
import { TimelineDriftController } from './TimelineDriftController';
import type { TimelineEvent } from '../../data/types/TimelineEvent';
import { Vector3, PerspectiveCamera, OrthographicCamera } from 'three';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { clearAllCardHovers } from '../../utils/three/cardUtils';
import type { CameraState } from './TimelineCamera';
import { useLogger } from '../../utils/logging/hooks/useLogger';
import { threeColors } from '../../config';


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

  // Calculate timelineLength based on events (consistent with TimelineEvents.tsx)
  const timelineLength = useMemo(() => {
    if (events.length === 0) return 100; // Default length if no events
    const minSpacing = 5;
    return Math.max(events.length * minSpacing, 100);
  }, [events]);

  // Debug logging for Grid component (only in debug mode)
  useEffect(() => {
    if (debugMode) {
      logger.debug('🔷 TimelineScene rendering with Grid component', {
        eventsCount: events.length,
        timelineLength,
        debugMode
      });
    }
  }, [events.length, timelineLength, debugMode]);

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

  // Viewport filtering component that has access to Three.js context
  const ViewportFilteredEvents: React.FC<{
    events: TimelineEvent[];
    selectedCardId: string | null;
    onSelect: (id: string | null) => void;
    onHover: (id: string | null) => void;
    onPositionUpdate: (id: string, position: Vector3) => void;
    getAnimationProps: any;
    currentPosition: number;
    isMarkerDragging: boolean;
    isTimelineHovering: boolean;
    droneMode: boolean;
  }> = (props) => {
    const { camera } = useThree();
    const lastUpdateRef = useRef<number>(0);
    const updateThrottleMs = 100;
    
    // Get event Z position (matching TimelineEvents.tsx logic)
    const getEventZPosition = (event: TimelineEvent, sortedEvents: TimelineEvent[]): number => {
      if (sortedEvents.length === 0) return 0;

      const minTime = sortedEvents[0].timestamp.getTime();
      const maxTime = sortedEvents[sortedEvents.length - 1].timestamp.getTime();
      const timeSpan = maxTime - minTime;

      if (timeSpan === 0) {
        const index = sortedEvents.findIndex(e => e.id === event.id);
        const spacing = 5;
        return (index - (sortedEvents.length - 1) / 2) * spacing;
      }

      const minSpacing = 5;
      const timelineLength = Math.max(sortedEvents.length * minSpacing, 100);
      const normalizedTime = (event.timestamp.getTime() - minTime) / timeSpan - 0.5;
      return normalizedTime * timelineLength;
    };

    // Filter events based on viewport
    const visibleEvents = useMemo(() => {
      const now = performance.now();
      
      // Throttle calculations
      if (now - lastUpdateRef.current < updateThrottleMs) {
        return props.events;
      }
      lastUpdateRef.current = now;

      // Sort events by timestamp once
      const sortedEvents = [...props.events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // Calculate visible bounds
      let visibleMinZ = -Infinity;
      let visibleMaxZ = Infinity;

      if (camera instanceof PerspectiveCamera) {
        const distance = camera.position.distanceTo(cameraTarget);
        const fovRadians = (camera.fov * Math.PI) / 180;
        const visibleHeight = 2 * Math.tan(fovRadians / 2) * distance;
        const aspect = camera.aspect;
        const visibleWidth = visibleHeight * aspect;
        const viewDistance = Math.max(visibleWidth, visibleHeight) * 0.5;
        
        visibleMinZ = cameraTarget.z - viewDistance * 1.5;
        visibleMaxZ = cameraTarget.z + viewDistance * 1.5;
      }

      // Filter events within viewport bounds
      let filtered = sortedEvents.filter(event => {
        const zPos = getEventZPosition(event, sortedEvents);
        return zPos >= visibleMinZ && zPos <= visibleMaxZ;
      });

      // Apply min/max constraints
      const minEvents = 50;
      const maxEvents = 200;
      
      if (filtered.length < minEvents && sortedEvents.length >= minEvents) {
        const centerIndex = Math.floor(sortedEvents.length / 2);
        const halfMin = Math.floor(minEvents / 2);
        const startIndex = Math.max(0, centerIndex - halfMin);
        const endIndex = Math.min(sortedEvents.length, startIndex + minEvents);
        filtered = sortedEvents.slice(startIndex, endIndex);
      } else if (filtered.length > maxEvents) {
        const distances = filtered.map(event => ({
          event,
          distance: Math.abs(getEventZPosition(event, sortedEvents) - props.currentPosition)
        }));
        distances.sort((a, b) => a.distance - b.distance);
        filtered = distances.slice(0, maxEvents).map(d => d.event);
        filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      }

      if (debugMode && props.events.length > 0) {
        const reduction = ((props.events.length - filtered.length) / props.events.length * 100).toFixed(1);
        logger.debug('Viewport filtering', {
          total: props.events.length,
          visible: filtered.length,
          reduction: `${reduction}%`
        });
      }

      return filtered;
    }, [props.events, props.currentPosition, camera, cameraTarget]);

    return <TimelineEvents {...props} events={visibleEvents} />;
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
