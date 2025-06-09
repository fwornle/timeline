import React from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { TimelineEvents } from './TimelineEvents';
import { TimelineEvent } from '../../data/types/TimelineEvent';
import { useViewportFiltering } from '../../hooks/useViewportFiltering';
import { useAppSelector } from '../../store';

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

export const ViewportFilteredEvents: React.FC<ViewportFilteredEventsProps> = React.memo((props) => {
  const { camera } = useThree();
  const showThinnedCards = useAppSelector(state => state.ui.showThinnedCards);
  
  // Use viewport filtering with better configuration
  const visibleEvents = useViewportFiltering(
    props.events,
    camera,
    props.cameraTarget,
    props.currentPosition,
    {
      paddingFactor: 1.2,    // Small padding to avoid pop-in/out at viewport edges
      minEvents: 0,          // Don't force minimum events - show only what's visible
      maxEvents: 200,        // Reduced as requested by user
      updateThrottleMs: 150, // Less aggressive updates to reduce re-renders
      debugMode: props.debugMode,
      windowSize: 110        // Fixed viewport window size (220 total, ±110)
    }
  );
  
  // Store visible count for BottomBar display and add debugging info
  React.useEffect(() => {
    sessionStorage.setItem('visibleEventsCount', visibleEvents.length.toString());
  }, [visibleEvents.length]);

  // Get thinned events from sessionStorage and resolve them
  const [thinnedEvents, setThinnedEvents] = React.useState<TimelineEvent[]>([]);
  React.useEffect(() => {
    const updateThinnedEvents = () => {
      const thinnedEventIds = sessionStorage.getItem('thinnedEvents');
      if (thinnedEventIds) {
        try {
          const ids: string[] = JSON.parse(thinnedEventIds);
          const resolved = ids.map(id => props.events.find(e => e.id === id)).filter(Boolean) as TimelineEvent[];
          setThinnedEvents(resolved);
        } catch (e) {
          console.warn('Failed to parse thinned events:', e);
          setThinnedEvents([]);
        }
      } else {
        setThinnedEvents([]);
      }
    };

    updateThinnedEvents();
    const interval = setInterval(updateThinnedEvents, 150); // Match viewport filtering throttle
    return () => clearInterval(interval);
  }, [props.events]);
  
  // Debug logging handled by useViewportFiltering hook
  

  return (
    <>
      {/* Regular visible events */}
      <TimelineEvents 
        events={props.events}
        visibleEvents={visibleEvents}
        selectedCardId={props.selectedCardId}
        onSelect={props.onSelect}
        onHover={props.onHover}
        onPositionUpdate={props.onPositionUpdate}
        getAnimationProps={props.getAnimationProps}
        currentPosition={props.currentPosition}
        isMarkerDragging={props.isMarkerDragging}
        isTimelineHovering={props.isTimelineHovering}
        droneMode={props.droneMode}
        debugMode={props.debugMode}
      />
      
      {/* Thinned events with red frames (only when showThinnedCards is true) */}
      {showThinnedCards && thinnedEvents.length > 0 && (
        <TimelineEvents 
          events={props.events}
          visibleEvents={thinnedEvents}
          selectedCardId={null} // Don't allow selection of thinned cards
          onSelect={() => {}} // No-op for thinned cards
          onHover={() => {}} // No-op for thinned cards
          onPositionUpdate={props.onPositionUpdate}
          isThinnedCards={true} // Mark these as thinned cards for red frame styling
          getAnimationProps={props.getAnimationProps}
          currentPosition={props.currentPosition}
          isMarkerDragging={props.isMarkerDragging}
          isTimelineHovering={props.isTimelineHovering}
          droneMode={props.droneMode}
          debugMode={props.debugMode}
        />
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Aggressive memoization for ViewportFilteredEvents
  return (
    prevProps.events === nextProps.events && // Reference equality for events array
    prevProps.selectedCardId === nextProps.selectedCardId &&
    prevProps.isMarkerDragging === nextProps.isMarkerDragging &&
    prevProps.isTimelineHovering === nextProps.isTimelineHovering &&
    prevProps.droneMode === nextProps.droneMode &&
    prevProps.debugMode === nextProps.debugMode &&
    // Only re-render for significant position changes
    Math.abs(prevProps.currentPosition - nextProps.currentPosition) < 1.0 &&
    // Only re-render for significant camera target changes
    prevProps.cameraTarget.distanceTo(nextProps.cameraTarget) < 2.0
  );
});