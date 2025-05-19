import { useEffect, useRef, useState } from 'react';
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
}

export const TimelineEvents: React.FC<TimelineEventsProps> = ({
  events,
  selectedCardId,
  onSelect,
  onHover,
  onPositionUpdate,
  getAnimationProps,
  currentPosition = 0
}) => {
  // Calculate positions for events based on their timestamps
  const getEventPosition = (event: TimelineEvent, allEvents: TimelineEvent[]): [number, number, number] => {
    // If no events, return default position
    if (allEvents.length === 0) return [0, 2, 0];
    
    // Sort all events by timestamp to find min and max dates
    const sortedEvents = [...allEvents].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const minTime = sortedEvents[0].timestamp.getTime();
    const maxTime = sortedEvents[sortedEvents.length - 1].timestamp.getTime();
    
    // Calculate the time range
    const timeRange = maxTime - minTime;
    
    // If all events have the same timestamp, spread them evenly around center
    if (timeRange === 0) {
      const index = allEvents.findIndex(e => e.id === event.id);
      const spacing = 5;
      // Center events around z=0
      const zPos = (index - (allEvents.length - 1) / 2) * spacing;
      
      // Alternate x positions for better visibility
      const xOffset = 3; // Reduced offset to save horizontal space
      const xPos = index % 2 === 0 ? -xOffset : xOffset;
      
      return [xPos, 2, zPos];
    }
    
    // Calculate timeline length based on the number of events and time range
    // Use a minimum spacing between events
    const minSpacing = 5; // Minimum units between events
    const timelineLength = Math.max(
      allEvents.length * minSpacing,
      100 // Minimum timeline length
    );
    
    // Map the event time to a position on the Z axis
    // Normalize event time to a value between -0.5 and 0.5
    const normalizedTime = (event.timestamp.getTime() - minTime) / timeRange - 0.5;
    
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

  // Track previous 'now' position
  const prevNowRef = useRef(currentPosition);
  // Track which cards should wiggle
  const [wiggleMap, setWiggleMap] = useState<{ [id: string]: boolean }>({});

  // Update position cache when events change
  useEffect(() => {
    events.forEach((event) => {
      const position = getEventPosition(event, events);
      onPositionUpdate(
        event.id,
        new Vector3(position[0], position[1], position[2])
      );
    });
  }, [events, onPositionUpdate]);

  useEffect(() => {
    // For each event, check if the now plane crossed its Z position
    events.forEach((event) => {
      const position = getEventPosition(event, events);
      const prevNow = prevNowRef.current;
      const cardZ = position[2];
      // If the now plane crossed the card (from either direction)
      if ((prevNow < cardZ && currentPosition >= cardZ) || (prevNow > cardZ && currentPosition <= cardZ)) {
        setWiggleMap((prev) => ({ ...prev, [event.id]: true }));
        // Reset wiggle after short time
        setTimeout(() => {
          setWiggleMap((prev) => ({ ...prev, [event.id]: false }));
        }, 300);
      }
    });
    prevNowRef.current = currentPosition;
  }, [currentPosition, events]);

  return (
    <group>
      {events.map((event) => {
        const position = getEventPosition(event, events);

        return (
          <TimelineCard
            key={event.id}
            event={event}
            position={position}
            selected={event.id === selectedCardId}
            onSelect={onSelect}
            onHover={onHover}
            animationProps={{
              ...getAnimationProps(event.id),
              rotation: getAnimationProps(event.id).rotation as [number, number, number]
            }}
            wiggle={!!wiggleMap[event.id]}
          />
        );
      })}
    </group>
  );
};
