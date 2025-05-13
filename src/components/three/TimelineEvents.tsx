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
  getAnimationProps
}) => {

  // Calculate positions along the timeline axis
  const getEventPosition = (index: number): [number, number, number] => {
    // Space events evenly along the Z axis
    const spacing = 2.5; // Distance between cards
    const startZ = events.length * spacing * -0.5; // Center the timeline
    return [0, 0, startZ + index * spacing];
  };

  // Effect to pause auto-scroll when a card is selected

  // Effect to register card positions with the animation system
  // Register card positions with parent
  useEffect(() => {
    events.forEach((event, index) => {
      const position = getEventPosition(index);
      onPositionUpdate(event.id, new Vector3(position[0], position[1], position[2]));
    });
  }, [events, onPositionUpdate, getEventPosition]);

  return (
    <group>
      {events.map((event, index) => {
        const position = getEventPosition(index);
        
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