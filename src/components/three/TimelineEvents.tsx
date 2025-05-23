import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { TimelineCard } from './TimelineCard';
import { Vector3 } from 'three';
import type { TimelineEvent } from '../../data/types/TimelineEvent';

interface TimelineEventsProps {
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
  currentPosition?: number;
  isMarkerDragging?: boolean;
}

export const TimelineEvents: React.FC<TimelineEventsProps> = ({
  events,
  selectedCardId,
  onSelect,
  onHover,
  onPositionUpdate,
  getAnimationProps,
  currentPosition = 0,
  isMarkerDragging = false
}) => {
  // Track the currently hovered card to enforce exclusivity
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // Handle hover with exclusivity
  const handleCardHover = useCallback((cardId: string | null) => {
    // Only update if the hover state actually changed
    if (hoveredCardId !== cardId) {
      setHoveredCardId(cardId);
      onHover(cardId);
    }
  }, [hoveredCardId, onHover]);
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

      // Calculate timeline length based on the number of events and time range
      // Use a minimum spacing between events
      const minSpacing = 5; // Minimum units between events
      const timelineLength = Math.max(
        events.length * minSpacing,
        100 // Minimum timeline length
      );

      // Map the event time to a position on the Z axis
      // Normalize event time to a value between -0.5 and 0.5
      const normalizedTime = (event.timestamp.getTime() - minTime) / timeSpan - 0.5;

      // Map to Z position - centered around z=0
      const zPos = normalizedTime * timelineLength;

      // Find the index of this event in the sorted events array for alternating sides
      const eventIndex = sortedEvents.findIndex(e => e.id === event.id);

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
      events.forEach((event) => {
        const position = getEventPosition(event);
        onPositionUpdate(
          event.id,
          new Vector3(position[0], position[1], position[2])
        );
      });
      lastEventsHashRef.current = eventsHash;
    }
  }, [events, onPositionUpdate, getEventPosition]);

  // Track active wiggle timeouts to prevent memory leaks
  const wiggleTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    // Throttle wiggle checks to prevent excessive updates during animation
    const threshold = 0.1; // Only check if position changed significantly
    const prevNow = prevNowRef.current;

    if (Math.abs(currentPosition - prevNow) < threshold) {
      return;
    }

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
        }, 200); // Shorter duration to prevent interference with animation

        wiggleTimeoutsRef.current.set(event.id, timeout);
      }
    });
    prevNowRef.current = currentPosition;
  }, [currentPosition, events, getEventPosition]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      wiggleTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      wiggleTimeoutsRef.current.clear();
    };
  }, []);

  return (
    <group>
      {events.map((event) => {
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
            isHovered={hoveredCardId === event.id}
          />
        );
      })}
    </group>
  );
};
