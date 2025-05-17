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

export const TimelineCard = ({
  event,
  selected = false,
  onSelect,
  onHover,
  position = [0, 0, 0],
  animationProps
}: TimelineCardProps) => {
  const groupRef = useRef<Group>(null);

  // Card dimensions
  const width = 2.2;
  const height = 1.4;
  const depth = 0.15;

  // Register card position for camera targeting
  useEffect(() => {
    if (groupRef.current) {
      const worldPosition = new Vector3();
      groupRef.current.getWorldPosition(worldPosition);
      onHover?.(event.id);
    }
  }, [event.id, onHover]);

  // Animation state
  const targetScale = animationProps?.scale ?? 1;
  const targetRotation = animationProps?.rotation ?? [0, 0, 0];
  const targetY = animationProps?.positionY ?? 0;

  // Animation parameters
  const { tension = 170 } = animationProps?.springConfig ?? {};
  const lerpFactor = tension / 1000;

  // Update animation
  useFrame((_, delta) => {
    if (groupRef.current) {
      // Update scale
      groupRef.current.scale.lerp(new Vector3(targetScale, targetScale, targetScale), lerpFactor * delta);

      // Update position
      groupRef.current.position.y = MathUtils.lerp(
        groupRef.current.position.y,
        targetY,
        lerpFactor * delta
      );

      // Update rotation
      groupRef.current.rotation.y = MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotation[1],
        lerpFactor * delta
      );
    }
  });

  // Colors based on event type and state
  const getColor = () => {
    if (selected) return '#3b82f6';
    return event.type === 'git' ? '#10b981' : '#8b5cf6';
  };

  // Get glow intensity based on selection state
  const getGlowIntensity = () => {
    return selected ? 0.8 : 0.2;
  };

  return (
    <group
      ref={groupRef}
      position={[position[0], targetY, position[2]]}
      onPointerEnter={() => onHover?.(event.id)}
      onPointerLeave={() => onHover?.(null)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect?.(event.id);
      }}
    >
      {/* Card body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshPhysicalMaterial
          color={getColor()}
          metalness={0.7}
          roughness={0.3}
          transparent
          opacity={0.9}
          emissive={getColor()}
          emissiveIntensity={getGlowIntensity()}
          clearcoat={0.5}
          clearcoatRoughness={0.3}
        />
      </mesh>

      {/* Event title */}
      <Text
        position={[0, 0.3, depth / 2 + 0.01]}
        fontSize={0.18}
        maxWidth={width * 0.9}
        color="white"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.woff2"
        outlineWidth={0.01}
        outlineColor="#00000080"
      >
        {event.title}
      </Text>

      {/* Event type badge */}
      <mesh position={[0, -0.2, depth / 2 + 0.01]}>
        <planeGeometry args={[0.6, 0.25]} />
        <meshBasicMaterial color={getColor()} transparent opacity={0.8} />
      </mesh>
      <Text
        position={[0, -0.2, depth / 2 + 0.02]}
        fontSize={0.12}
        color="white"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-SemiBold.woff2"
      >
        {event.type.toUpperCase()}
      </Text>

      {/* Timestamp */}
      <Text
        position={[0, -0.5, depth / 2 + 0.01]}
        fontSize={0.1}
        color="white"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Regular.woff2"
      >
        {event.timestamp.toLocaleDateString()}
      </Text>
    </group>
  );
};