import React from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { TimelineEvents } from './TimelineEvents';
import { TimelineEvent } from '../../data/types/TimelineEvent';
import { useViewportFiltering } from '../../hooks/useViewportFiltering';

interface ViewportFilteredEventsProps {
  events: TimelineEvent[];
  selectedCardId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onPositionUpdate: (id: string, position: Vector3) => void;
  getAnimationProps: (id: string) => {
    scale: 1 | 1.1 | 1.2;
    rotation: readonly [0, number, 0];
    positionY: 0 | 0.2 | 0.5;
    springConfig: {
      mass: number;
      tension: number;
      friction: number;
    };
  };
  currentPosition: number;
  isMarkerDragging: boolean;
  isTimelineHovering: boolean;
  droneMode: boolean;
  cameraTarget: Vector3;
  debugMode?: boolean;
}

export const ViewportFilteredEvents: React.FC<ViewportFilteredEventsProps> = (props) => {
  const { camera } = useThree();
  
  // Use viewport filtering with fixed calculation
  const visibleEvents = useViewportFiltering(
    props.events,
    camera,
    props.cameraTarget,
    props.currentPosition,
    {
      paddingFactor: 1.2,  // Reduced from 2.0 to load less data outside viewport
      minEvents: 30,       // Reduced from 50 for better performance
      maxEvents: 150,      // Reduced from 200 for better performance
      updateThrottleMs: 200,  // Increased from 100ms to reduce update frequency
      debugMode: props.debugMode
    }
  );
  

  return (
    <TimelineEvents 
      events={visibleEvents}
      selectedCardId={props.selectedCardId}
      onSelect={props.onSelect}
      onHover={props.onHover}
      onPositionUpdate={props.onPositionUpdate}
      getAnimationProps={props.getAnimationProps}
      currentPosition={props.currentPosition}
      isMarkerDragging={props.isMarkerDragging}
      isTimelineHovering={props.isTimelineHovering}
      droneMode={props.droneMode}
    />
  );
};