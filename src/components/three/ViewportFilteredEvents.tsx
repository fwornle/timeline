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
  
  // Use viewport filtering with better configuration
  const visibleEvents = useViewportFiltering(
    props.events,
    camera,
    props.cameraTarget,
    props.currentPosition,
    {
      paddingFactor: 1.2,    // Small padding to avoid pop-in/out at viewport edges
      minEvents: 0,          // Don't force minimum events - show only what's visible
      maxEvents: 500,        // Higher limit to not artificially cap results
      updateThrottleMs: 100, // More responsive updates
      debugMode: props.debugMode,
      windowSize: 110        // Fixed viewport window size (220 total, ±110)
    }
  );
  
  // Store visible count for BottomBar display and add debugging info
  React.useEffect(() => {
    sessionStorage.setItem('visibleEventsCount', visibleEvents.length.toString());
  }, [visibleEvents.length]);
  
  if (props.debugMode) {
    console.log(`[ViewportFilteredEvents] Total events: ${props.events.length}, Visible: ${visibleEvents.length}, Position: ${props.currentPosition.toFixed(1)}`);
  }
  

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