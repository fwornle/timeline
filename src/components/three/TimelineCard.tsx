import { useRef, useEffect } from 'react';
import { Text } from '@react-three/drei';
import { Group, Vector3, MathUtils } from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import type { TimelineEvent } from '../../data/types/TimelineEvent';
import type { SpringConfig } from '../../animation/transitions';

interface TimelineCardProps {
  event: TimelineEvent;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
  position?: [number, number, number];
  animationProps?: {
    scale: number;
    rotation: [number, number, number];
    positionY: number;
    springConfig: SpringConfig;
  };
}

export const TimelineCard: React.FC<TimelineCardProps> = ({
  event,
  selected = false,
  onSelect,
  onHover,
  position = [0, 0, 0],
  animationProps = {
    scale: 1,
    rotation: [0, 0, 0],
    positionY: 0,
    springConfig: { mass: 1, tension: 170, friction: 26 }
  }
}) => {
  const groupRef = useRef<Group>(null);
  const targetPositionY = useRef(position[1]);
  const targetScale = useRef(1);
  const targetRotationY = useRef(0);

  // Update target values when animation props change
  useEffect(() => {
    targetPositionY.current = position[1] + animationProps.positionY;
    targetScale.current = animationProps.scale;
    targetRotationY.current = animationProps.rotation[1];
  }, [animationProps, position]);

  // Apply spring animation
  useFrame(() => {
    if (!groupRef.current) return;

    const { springConfig } = animationProps;
    const { mass, tension, friction } = springConfig;

    // Calculate spring forces
    const currentPositionY = groupRef.current.position.y;
    const currentScale = groupRef.current.scale.x;
    const currentRotationY = groupRef.current.rotation.y;

    // Position Y spring
    const posYDiff = targetPositionY.current - currentPositionY;
    const posYVelocity = posYDiff * tension / mass;
    const posYDamping = friction / mass;
    const newPositionY = currentPositionY + posYVelocity * (1 - posYDamping) * 0.016;

    // Scale spring
    const scaleDiff = targetScale.current - currentScale;
    const scaleVelocity = scaleDiff * tension / mass;
    const scaleDamping = friction / mass;
    const newScale = currentScale + scaleVelocity * (1 - scaleDamping) * 0.016;

    // Rotation spring
    const rotYDiff = targetRotationY.current - currentRotationY;
    const rotYVelocity = rotYDiff * tension / mass;
    const rotYDamping = friction / mass;
    const newRotationY = currentRotationY + rotYVelocity * (1 - rotYDamping) * 0.016;

    // Apply new values
    groupRef.current.position.y = newPositionY;
    groupRef.current.scale.set(newScale, newScale, newScale);
    groupRef.current.rotation.y = newRotationY;
  });

  // Event handlers
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(event.id);
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (onHover) {
      onHover(event.id);
    }
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (onHover) {
      onHover(null);
    }
  };

  // Determine card color based on event type
  const cardColor = event.type === 'git' ? '#3498db' : '#9b59b6';
  const cardWidth = 3;
  const cardHeight = 2;

  return (
    <group
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Card background */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[cardWidth, cardHeight, 0.1]} />
        <meshStandardMaterial
          color={cardColor}
          roughness={0.5}
          metalness={0.2}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Card content */}
      <group position={[0, 0.5, 0.06]}>
        {/* Title */}
        <Text
          position={[0, 0.3, 0]}
          fontSize={0.2}
          maxWidth={2.5}
          lineHeight={1.2}
          textAlign="center"
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {event.title}
        </Text>

        {/* Type badge */}
        <mesh position={[0, -0.4, 0]}>
          <planeGeometry args={[1, 0.3]} />
          <meshBasicMaterial
            color={event.type === 'git' ? '#2980b9' : '#8e44ad'}
            transparent
            opacity={0.9}
          />
        </mesh>
        <Text
          position={[0, -0.4, 0.01]}
          fontSize={0.15}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {event.type === 'git' ? 'Commit' : 'Spec'}
        </Text>

        {/* Date */}
        <Text
          position={[0, -0.7, 0]}
          fontSize={0.12}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {event.timestamp.toLocaleDateString()}
        </Text>
      </group>

      {/* Selection indicator */}
      {selected && (
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[cardWidth + 0.2, cardHeight + 0.2, 0.01]} />
          <meshBasicMaterial color="#f1c40f" />
        </mesh>
      )}
    </group>
  );
};
