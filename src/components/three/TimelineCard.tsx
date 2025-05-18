import { useRef, useEffect, useState } from 'react';
import { Text } from '@react-three/drei';
import { Group, MathUtils, Vector3 } from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import type { TimelineEvent } from '../../data/types/TimelineEvent';
import type { SpringConfig } from '../../animation/transitions';
import { DEFAULTS } from '../../animation/constants';

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
  // Refs for animation
  const groupRef = useRef<Group>(null);
  const isHovered = useRef(false);

  // Animation state
  const [animState, setAnimState] = useState({
    // Target values for animation
    targetRotationY: 0,
    targetPositionZ: 0,
    targetScale: 1,

    // Animation timing
    animationStartTime: 0,
    isAnimating: false,

    // Starting values for smooth interpolation
    startRotationY: 0,
    startPositionZ: 0,
    startScale: 1,
  });

  // Update hover state when animation props change
  useEffect(() => {
    const newIsHovered = animationProps.scale === DEFAULTS.CARD.SCALE.HOVER;

    // Only trigger animation if hover state changed
    if (newIsHovered !== isHovered.current) {
      isHovered.current = newIsHovered;

      // Store current values as starting point
      const currentRotationY = groupRef.current?.rotation.y || 0;
      const currentPositionZ = groupRef.current?.position.z || position[2];
      const currentScale = groupRef.current?.scale.x || 1;

      // Set target values based on hover state
      const targetRotationY = newIsHovered ? Math.PI / 3 : 0; // 60 degrees when hovered
      const targetPositionZ = newIsHovered ? position[2] + 0.5 : position[2]; // Move slightly toward camera
      const targetScale = newIsHovered ? 1.3 : 1; // Larger when hovered

      // Start animation
      setAnimState({
        targetRotationY,
        targetPositionZ,
        targetScale,
        animationStartTime: performance.now(),
        isAnimating: true,
        startRotationY: currentRotationY,
        startPositionZ: currentPositionZ,
        startScale: currentScale,
      });
    }
  }, [animationProps, position]);

  // Animation frame
  useFrame(() => {
    if (!groupRef.current) return;

    if (animState.isAnimating) {
      // Calculate animation progress
      const elapsedTime = performance.now() - animState.animationStartTime;
      const duration = 300; // Animation duration in ms (faster for better responsiveness)
      const progress = Math.min(elapsedTime / duration, 1);

      // Easing function (ease-in-out)
      const easedProgress = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Interpolate values
      const newRotationY = MathUtils.lerp(
        animState.startRotationY,
        animState.targetRotationY,
        easedProgress
      );

      const newPositionZ = MathUtils.lerp(
        animState.startPositionZ,
        animState.targetPositionZ,
        easedProgress
      );

      const newScale = MathUtils.lerp(
        animState.startScale,
        animState.targetScale,
        easedProgress
      );

      // Apply values
      groupRef.current.rotation.y = newRotationY;
      groupRef.current.position.z = newPositionZ;
      groupRef.current.scale.set(newScale, newScale, newScale);

      // End animation when complete
      if (progress >= 1) {
        setAnimState(prev => ({ ...prev, isAnimating: false }));
      }
    }
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
