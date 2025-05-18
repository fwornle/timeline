import { useEffect } from 'react';
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
}

export const TimelineEvents: React.FC<TimelineEventsProps> = ({
  events,
  selectedCardId,
  onSelect,
  onHover,
  onPositionUpdate,
  getAnimationProps,
}) => {
  // Calculate positions for events based on their timestamps
  const getEventPosition = (event: TimelineEvent, allEvents: TimelineEvent[]): [number, number, number] => {
    // If no events, return default position
    if (allEvents.length === 0) return [0, 0, 0];
    
    // Sort all events by timestamp to find min and max dates
    const sortedEvents = [...allEvents].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const minTime = sortedEvents[0].timestamp.getTime();
    const maxTime = sortedEvents[sortedEvents.length - 1].timestamp.getTime();
    
    // Calculate the time range
    const timeRange = maxTime - minTime;
    
    // If all events have the same timestamp, spread them evenly
    if (timeRange === 0) {
      const index = allEvents.findIndex(e => e.id === event.id);
      const spacing = 5;
      const zPos = index * spacing;
      
      // Alternate x positions for better visibility
      const xOffset = 4;
      const xPos = index % 2 === 0 ? -xOffset : xOffset;
      
      return [xPos, 0, zPos];
    }
    
    // Map the event time to a position on the Z axis
    // Normalize event time to a value between 0 and 1
    const normalizedTime = (event.timestamp.getTime() - minTime) / timeRange;
    
    // Map to Z position - newer events (higher timestamp) should be further along (higher Z)
    // Length of timeline based on number of events with some padding
    const timelineLength = allEvents.length * 5;
    const zPos = normalizedTime * timelineLength;
    
    // Alternate x positions for better visibility
    // We can use the event ID to ensure consistent x positions
    const xOffset = 4;
    const xPos = event.id.charCodeAt(0) % 2 === 0 ? -xOffset : xOffset;
    
    // Y position is 0 by default, will be animated
    const yPos = 0;
    
    return [xPos, yPos, zPos];
  };

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
          />
        );
      })}
    </group>
  );
};
