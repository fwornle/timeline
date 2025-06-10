import React from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { TimelineEvents } from './TimelineEvents';
import { TimelineEvent } from '../../data/types/TimelineEvent';
import { useViewportFiltering } from '../../hooks/useViewportFiltering';
import { useAppSelector, useAppDispatch } from '../../store';
import { setVisibleEventsCount } from '../../store/slices/uiSlice';
import { useLogger } from '../../utils/logging/hooks/useLogger';

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
  const dispatch = useAppDispatch();
  const showThinnedCards = useAppSelector(state => state.ui.showThinnedCards);
  const thinnedEvents = useAppSelector(state => state.timeline.thinnedEvents);
  const logger = useLogger({ component: 'ViewportFilteredEvents', topic: 'rendering' });
  
  // Use viewport filtering with performance-optimized configuration
  // Reduce maxEvents during drift mode for better performance
  const maxEventsForMode = props.droneMode ? 200 : 250;
  
  const visibleEvents = useViewportFiltering(
    props.events,
    camera,
    props.cameraTarget,
    props.currentPosition,
    {
      paddingFactor: 1.2,    // Small padding to avoid pop-in/out at viewport edges
      minEvents: 0,          // Don't force minimum events - show only what's visible
      maxEvents: maxEventsForMode, // Dynamic based on mode for better performance
      updateThrottleMs: 200, // Increased throttle for better performance during drift
      debugMode: props.debugMode,
      windowSize: 110        // Fixed viewport window size (220 total, ±110)
    }
  );
  
  // Update Redux state with visible count (throttled to reduce re-renders)
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      dispatch(setVisibleEventsCount(visibleEvents.length));
    }, 100); // 100ms throttle to batch rapid changes
    
    return () => clearTimeout(timeoutId);
  }, [dispatch, visibleEvents.length]);
  
  // Debug logging for visible events
  React.useEffect(() => {
    logger.debug('ViewportFilteredEvents rendering:', {
      visibleEventsCount: visibleEvents.length,
      totalEventsCount: props.events.length,
      firstVisibleEvent: visibleEvents[0]?.id.slice(0, 8),
      showThinnedCards,
      thinnedEventsCount: thinnedEvents.length
    });
  }, [visibleEvents, props.events, showThinnedCards, thinnedEvents, logger]);

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
        isThinnedCards={false}
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
  // Aggressive memoization for ViewportFilteredEvents - return true if props are EQUAL (skip re-render)
  const propsEqual = (
    prevProps.events === nextProps.events && // Reference equality for events array
    prevProps.selectedCardId === nextProps.selectedCardId &&
    prevProps.isMarkerDragging === nextProps.isMarkerDragging &&
    prevProps.isTimelineHovering === nextProps.isTimelineHovering &&
    prevProps.droneMode === nextProps.droneMode &&
    prevProps.debugMode === nextProps.debugMode &&
    // Only re-render for significant position changes (>= 1.0 world units)
    Math.abs(prevProps.currentPosition - nextProps.currentPosition) < 1.0 &&
    // Only re-render for significant camera target changes (>= 2.0 world units)
    prevProps.cameraTarget.distanceTo(nextProps.cameraTarget) < 2.0
  );
  
  return propsEqual; // Return true to skip re-render when props are equal
});