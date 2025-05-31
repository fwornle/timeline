import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { TimelineCard } from './TimelineCard';
import { Vector3 } from 'three';
import { useThree } from '@react-three/fiber';
import type { TimelineEvent } from '../../data/types/TimelineEvent';
import { calculateEventZPositionWithIndex, calculateTimelineLength } from '../../utils/timeline/timelineCalculations';
import { dimensions } from '../../config';

interface TimelineEventsProps {
  events: TimelineEvent[]; // All events for position calculation
  visibleEvents?: TimelineEvent[]; // Filtered events for rendering (optional for backward compatibility)
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
  currentPosition?: number;
  isMarkerDragging?: boolean;
  isTimelineHovering?: boolean;
  droneMode?: boolean;
  debugMode?: boolean;
}

export const TimelineEvents: React.FC<TimelineEventsProps> = ({
  events,
  visibleEvents,
  selectedCardId,
  onSelect,
  onHover,
  onPositionUpdate,
  getAnimationProps,
  currentPosition = 0,
  isMarkerDragging = false,
  isTimelineHovering = false,
  droneMode = false,
  debugMode = false
}) => {
  // Use visibleEvents for rendering if provided, otherwise render all events
  const eventsToRender = visibleEvents || events;
  
  // Debug logging to track filtering behavior
  if (debugMode && visibleEvents) {
    console.log(`[TimelineEvents] Total events: ${events.length}, Rendering: ${eventsToRender.length}, Position: ${currentPosition.toFixed(1)}`);
  }
  // Track the currently hovered card to enforce exclusivity
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  
  // Get camera reference for occlusion detection
  const { camera } = useThree();

  // Store onPositionUpdate in ref to avoid dependency issues
  const onPositionUpdateRef = useRef(onPositionUpdate);
  onPositionUpdateRef.current = onPositionUpdate;

  // Handle hover with exclusivity
  const handleCardHover = useCallback((cardId: string | null) => {
    // Use functional update to avoid stale closure issues
    setHoveredCardId(prev => {
      // Only update if the hover state actually changed
      if (prev !== cardId) {
        // Defer the parent callback to avoid setState-in-render
        setTimeout(() => onHover(cardId), 0);
        return cardId;
      }
      return prev;
    });
  }, [onHover]);

  // Memoize sorted events to avoid recalculating on every render
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [events]);

  // Memoize time range calculation
  const timeRange = useMemo(() => {
    if (sortedEvents.length === 0) return { minTime: 0, maxTime: 0 };
    return {
      minTime: sortedEvents[0].timestamp.getTime(),
      maxTime: sortedEvents[sortedEvents.length - 1].timestamp.getTime()
    };
  }, [sortedEvents]);

  // Calculate positions for events based on their timestamps (optimized)
  // Memoize the position calculation to prevent infinite loops
  const getEventPosition = useMemo(() => {
    // Create a stable function that doesn't change unless events or timeRange change
    return (event: TimelineEvent): [number, number, number] => {
      // If no events, return default position
      if (events.length === 0) return [0, 2, 0];

      const { minTime, maxTime } = timeRange;

      // Calculate the time span
      const timeSpan = maxTime - minTime;

      // If all events have the same timestamp, spread them evenly around center
      if (timeSpan === 0) {
        const index = events.findIndex((e: TimelineEvent) => e.id === event.id);
        const spacing = 5;
        // Center events around z=0
        const zPos = (index - (events.length - 1) / 2) * spacing;

        // Alternate x positions for better visibility
        const xOffset = 3; // Reduced offset to save horizontal space
        const xPos = index % 2 === 0 ? -xOffset : xOffset;

        return [xPos, 2, zPos];
      }

      // Use centralized position calculation
      const eventIndex = sortedEvents.findIndex(e => e.id === event.id);
      const zPos = calculateEventZPositionWithIndex(event, eventIndex, minTime, maxTime, events.length);

      // Alternate x positions for better visibility based on sorted index
      const xOffset = 3; // Reduced offset to save horizontal space
      const xPos = eventIndex % 2 === 0 ? -xOffset : xOffset;

      // Y position is raised to move everything up
      const yPos = 2;

      return [xPos, yPos, zPos];
    };
  }, [events, timeRange, sortedEvents]);

  // Track previous 'now' position
  const prevNowRef = useRef(currentPosition);
  // Track which cards should wiggle
  const [wiggleMap, setWiggleMap] = useState<{ [id: string]: boolean }>({});

  // Update position cache when events change
  // Use a ref to track if we've already updated positions for this event set
  const lastEventsHashRef = useRef<string>('');

  useEffect(() => {
    // Create a hash of the events to detect actual changes
    const eventsHash = events.map(e => `${e.id}-${e.timestamp.getTime()}`).join('|');

    // Only update if events actually changed
    if (eventsHash !== lastEventsHashRef.current) {
      // Use requestAnimationFrame to defer the position updates until after render
      requestAnimationFrame(() => {
        events.forEach((event) => {
          const position = getEventPosition(event);
          onPositionUpdateRef.current(
            event.id,
            new Vector3(position[0], position[1], position[2])
          );
        });
      });
      lastEventsHashRef.current = eventsHash;
    }
  }, [events, getEventPosition]);

  // Track active wiggle timeouts to prevent memory leaks
  const wiggleTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    // Throttle wiggle checks to prevent excessive updates during animation
    const threshold = 1.0; // Increase threshold to reduce frequency
    const prevNow = prevNowRef.current;

    if (Math.abs(currentPosition - prevNow) < threshold) {
      return;
    }

    // Use requestAnimationFrame to defer the wiggle check and prevent blocking
    const checkWiggle = () => {
      // For each event, check if the now plane crossed its Z position
      events.forEach((event) => {
        const position = getEventPosition(event);
        const cardZ = position[2];

        // If the now plane crossed the card (from either direction)
        if ((prevNow < cardZ && currentPosition >= cardZ) || (prevNow > cardZ && currentPosition <= cardZ)) {
          // Clear any existing timeout for this card
          const existingTimeout = wiggleTimeoutsRef.current.get(event.id);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          // Start wiggle animation
          setWiggleMap((prev) => ({ ...prev, [event.id]: true }));

          // Set timeout to stop wiggle
          const timeout = setTimeout(() => {
            setWiggleMap((prev) => ({ ...prev, [event.id]: false }));
            wiggleTimeoutsRef.current.delete(event.id);
          }, 300); // Slightly longer duration for better visibility

          wiggleTimeoutsRef.current.set(event.id, timeout);
        }
      });
      prevNowRef.current = currentPosition;
    };

    // Defer the wiggle check to the next frame to prevent blocking
    requestAnimationFrame(checkWiggle);
  }, [currentPosition, events, getEventPosition]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      wiggleTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      wiggleTimeoutsRef.current.clear();
    };
  }, []);

  // Calculate which cards should be faded due to occlusion
  const cardFadeStates = useMemo(() => {
    if (!hoveredCardId) return new Map<string, number>();
    
    const config = dimensions.animation.card.occlusion;
    if (!config.enableFrontCardFading) return new Map<string, number>();
    
    const fadeMap = new Map<string, number>();
    
    // Find the hovered card position
    const hoveredEvent = eventsToRender.find(e => e.id === hoveredCardId);
    if (!hoveredEvent) return fadeMap;
    
    const hoveredPosition = getEventPosition(hoveredEvent);
    const hoveredWorldPos = new Vector3(hoveredPosition[0], hoveredPosition[1], hoveredPosition[2]);
    const cameraPos = camera.position.clone();
    
    // Calculate camera direction to hovered card
    const cameraToHovered = new Vector3().subVectors(hoveredWorldPos, cameraPos).normalize();
    
    // Check each other card to see if it's "in front" of the hovered card
    eventsToRender.forEach(event => {
      if (event.id === hoveredCardId) {
        fadeMap.set(event.id, 1.0); // Hovered card is always fully visible
        return;
      }
      
      const eventPosition = getEventPosition(event);
      const eventWorldPos = new Vector3(eventPosition[0], eventPosition[1], eventPosition[2]);
      
      // Calculate distance from camera to this card
      const cameraToEvent = new Vector3().subVectors(eventWorldPos, cameraPos);
      const distanceToEvent = cameraToEvent.length();
      const distanceToHovered = cameraToHovered.length() * hoveredWorldPos.distanceTo(cameraPos);
      
      // Check if this card is between camera and hovered card
      const isInFront = distanceToEvent < distanceToHovered;
      
      // Also check if cards are close enough to cause occlusion
      const cardDistance = eventWorldPos.distanceTo(hoveredWorldPos);
      const isTooClose = cardDistance < config.frontCardDistanceThreshold;
      
      if (isInFront && isTooClose) {
        fadeMap.set(event.id, config.frontCardFadeOpacity);
      } else {
        fadeMap.set(event.id, 1.0);
      }
    });
    
    return fadeMap;
  }, [hoveredCardId, eventsToRender, getEventPosition, camera.position]);

  // Memoize the cards to prevent unnecessary re-renders
  const renderedCards = useMemo(() => {
    return eventsToRender.map((event) => {
      const position = getEventPosition(event);

      return (
        <TimelineCard
          key={event.id}
          event={event}
          position={position}
          selected={event.id === selectedCardId}
          onSelect={onSelect}
          onHover={handleCardHover}
          animationProps={{
            ...getAnimationProps(event.id),
            rotation: getAnimationProps(event.id).rotation as [number, number, number]
          }}
          wiggle={!!wiggleMap[event.id]}
          isMarkerDragging={isMarkerDragging}
          droneMode={droneMode}
          isHovered={hoveredCardId === event.id}
          fadeOpacity={cardFadeStates.get(event.id) ?? 1.0}
        />
      );
    });
  }, [eventsToRender, getEventPosition, selectedCardId, onSelect, handleCardHover, getAnimationProps, wiggleMap, isMarkerDragging, isTimelineHovering, droneMode, hoveredCardId, cardFadeStates]);

  return (
    <group>
      {renderedCards}
    </group>
  );
};
