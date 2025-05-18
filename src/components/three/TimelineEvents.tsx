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
  // Calculate positions for events
  const getEventPosition = (index: number, totalEvents: number): [number, number, number] => {
    // Position events along the z-axis (timeline)
    // Spread them out with some spacing
    const spacing = 5;

    // Reverse the order so that newer events (higher indices) are further away (higher z)
    // This makes the timeline go from present (near) to future (far)
    const zPos = (totalEvents - 1 - index) * spacing;

    // Alternate x positions for better visibility
    const xOffset = 4;
    const xPos = index % 2 === 0 ? -xOffset : xOffset;

    // Y position is 0 by default, will be animated
    const yPos = 0;

    return [xPos, yPos, zPos];
  };

  // Update position cache when events change
  useEffect(() => {
    events.forEach((event, index) => {
      const position = getEventPosition(index, events.length);
      onPositionUpdate(
        event.id,
        new Vector3(position[0], position[1], position[2])
      );
    });
  }, [events, onPositionUpdate]);

  return (
    <group>
      {events.map((event, index) => {
        const position = getEventPosition(index, events.length);

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
