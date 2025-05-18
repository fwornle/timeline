import { useRef, useEffect, useState } from 'react';
import { Text } from '@react-three/drei';
import { Group, MathUtils, Vector3 } from 'three';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
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

// Global state to ensure only one card can be hovered at a time
const globalHoveredCardId = { current: null as string | null };

// Global state for debouncing hover events
const hoverDebounce = {
  // Track the last time a hover state changed
  lastHoverChangeTime: 0,
  // Minimum time (ms) between hover state changes
  debounceTime: 500,
  // Track if we're in a hover animation
  isInHoverAnimation: false,
  // Track the last mouse position
  lastMousePosition: { x: 0, y: 0 },
  // Track if camera is moving (to disable hover effects)
  isCameraMoving: false,
  // Last time camera moved
  lastCameraMoveTime: 0,
  // Camera movement cooldown (ms)
  cameraCooldownTime: 300,
};

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
  // Get camera for proper rotation calculation and movement tracking
  const { camera } = useThree();
  const prevCameraPosition = useRef(camera.position.clone());

  // Check for camera movement on each frame
  useFrame(() => {
    // Calculate distance moved
    const distanceMoved = camera.position.distanceTo(prevCameraPosition.current);

    // If camera moved significantly
    if (distanceMoved > 0.05) {
      // Mark camera as moving
      hoverDebounce.isCameraMoving = true;
      hoverDebounce.lastCameraMoveTime = performance.now();

      // If this card is hovered and camera is moving, clear hover state
      if (isHovered.current && globalHoveredCardId.current === event.id) {
        if (onHover) {
          console.debug(`Clearing hover on ${event.id} due to camera movement`);
          onHover(null);
        }
      }
    } else {
      // Check if camera cooldown period has passed
      const now = performance.now();
      if (hoverDebounce.isCameraMoving &&
          (now - hoverDebounce.lastCameraMoveTime) > hoverDebounce.cameraCooldownTime) {
        hoverDebounce.isCameraMoving = false;
      }
    }

    // Update previous position
    prevCameraPosition.current.copy(camera.position);
  });

  // Refs for animation
  const groupRef = useRef<Group>(null);
  const isHovered = useRef(false);

  // Animation state
  const [animState, setAnimState] = useState({
    // Target values for animation
    targetRotationY: 0,
    targetPositionY: position[1],
    targetPositionZ: position[2],
    targetScale: 1,

    // Animation timing
    animationStartTime: 0,
    isAnimating: false,
    animationDuration: 250, // Default animation duration in ms

    // Starting values for smooth interpolation
    startRotationY: 0,
    startPositionY: position[1],
    startPositionZ: position[2],
    startScale: 1,
  });

  // Calculate camera-related values for animation
  const calculateCameraValues = () => {
    if (!groupRef.current) return { angle: 0, distance: 10, zoomFactor: 1.5, moveDistance: 1.0 };

    // Get card position in world space
    const cardPosition = new Vector3(position[0], position[1], position[2]);

    // Get camera position
    const cameraPosition = camera.position.clone();

    // Calculate direction from card to camera (only in XZ plane for Y rotation)
    const direction = new Vector3(
      cameraPosition.x - cardPosition.x,
      0,
      cameraPosition.z - cardPosition.z
    ).normalize();

    // Calculate angle - we want the card to face the camera
    // Math.atan2 gives us the angle in radians
    const angle = Math.atan2(direction.x, direction.z);

    // Calculate distance from camera to card
    const distance = cardPosition.distanceTo(cameraPosition);

    // Debug distance in console when hovering
    if (isHovered.current) {
      console.debug(`Camera distance to card: ${distance.toFixed(2)} units`);
    }

    // Calculate zoom factor based on distance
    // Instead of scaling relative to initial size, we'll calculate an absolute target size
    // This ensures all cards zoom to approximately the same final size regardless of initial distance

    // Target apparent size in the camera view (in world units)
    // This is the size we want all cards to appear when hovered, regardless of distance
    const targetApparentSize = 10; // Adjust this value to control final card size

    // Calculate the scale needed to make the card appear at the target size
    // The formula is: (target apparent size / actual size) * (distance / reference distance)
    // Where reference distance is a constant that helps normalize the scale
    const cardBaseSize = 3; // Width of the card in world units
    const referenceDistance = 15; // A reference distance for normalization

    // Calculate absolute scale factor needed to make the card appear at target size
    // Further cards need more scaling to reach the same apparent size
    const absoluteScaleFactor = (targetApparentSize / cardBaseSize) * (distance / referenceDistance);

    // Apply a minimum scale factor to ensure cards don't get too small when close to camera
    // and a maximum to prevent cards from becoming too large
    const zoomFactor = Math.min(Math.max(absoluteScaleFactor, 1.5), 8.0);

    // Debug zoom factor when hovering
    if (isHovered.current) {
      console.debug(`Distance: ${distance.toFixed(2)}, Absolute scale: ${absoluteScaleFactor.toFixed(2)}, Final zoom: ${zoomFactor.toFixed(2)}`);
    }

    // Calculate how far to move the card toward the camera
    // We want cards to move a consistent percentage of their distance to the camera
    // This ensures cards at different distances all move a visually similar amount

    // Move the card forward by a percentage of its distance to the camera
    // This creates a consistent visual effect regardless of initial distance
    const movePercentage = 0.3; // Move forward by 30% of the distance to camera
    const moveDistance = distance * movePercentage;

    // Apply minimum and maximum limits to prevent extreme movements
    const finalMoveDistance = Math.min(Math.max(moveDistance, 2.0), 20.0);

    // Debug move distance when hovering
    if (isHovered.current) {
      console.debug(`Move distance: ${finalMoveDistance.toFixed(2)} units (${(movePercentage * 100).toFixed(0)}% of ${distance.toFixed(2)})`);
    }

    return { angle, distance, zoomFactor, moveDistance: finalMoveDistance };
  };

  // Update hover state when animation props change
  useEffect(() => {
    const newIsHovered = animationProps.scale === DEFAULTS.CARD.SCALE.HOVER;

    // Only trigger animation if hover state changed
    if (newIsHovered !== isHovered.current) {
      console.debug(`Animation props changed for ${event.id}, hover: ${newIsHovered}`);
      isHovered.current = newIsHovered;

      // Update global hovered card tracking
      if (newIsHovered) {
        globalHoveredCardId.current = event.id;

        // Mark that we're in a hover animation
        hoverDebounce.isInHoverAnimation = true;
        hoverDebounce.lastHoverChangeTime = performance.now();
      } else if (globalHoveredCardId.current === event.id) {
        globalHoveredCardId.current = null;
      }

      // Store current values as starting point
      const currentRotationY = groupRef.current?.rotation.y || 0;
      const currentPositionY = groupRef.current?.position.y || position[1];
      const currentPositionZ = groupRef.current?.position.z || position[2];
      const currentScale = groupRef.current?.scale.x || 1;

      // Get camera-dependent values
      const { angle, zoomFactor, moveDistance } = calculateCameraValues();

      // Set target values based on hover state
      const targetRotationY = newIsHovered ? angle : 0;
      const targetPositionY = newIsHovered ? position[1] + 0.5 : position[1]; // Move up when hovered
      const targetPositionZ = newIsHovered ? position[2] - moveDistance : position[2]; // Move toward camera (negative Z)
      const targetScale = newIsHovered ? zoomFactor : 1; // Larger when hovered

      // Start animation with longer duration for hover animations to give more time to read
      const animationDuration = newIsHovered ? 400 : 250; // Longer for hover, shorter for unhover

      // Start animation
      setAnimState({
        targetRotationY,
        targetPositionY,
        targetPositionZ,
        targetScale,
        animationStartTime: performance.now(),
        isAnimating: true,
        startRotationY: currentRotationY,
        startPositionY: currentPositionY,
        startPositionZ: currentPositionZ,
        startScale: currentScale,
        animationDuration, // Store the duration for use in the animation frame
      });
    }
  }, [animationProps, position, camera, event.id]);

  // Animation frame
  useFrame(() => {
    if (!groupRef.current) return;

    // Force unhover if another card is hovered
    if (isHovered.current && globalHoveredCardId.current !== event.id) {
      isHovered.current = false;

      // Start unhover animation
      const currentRotationY = groupRef.current.rotation.y;
      const currentPositionY = groupRef.current.position.y;
      const currentPositionZ = groupRef.current.position.z;
      const currentScale = groupRef.current.scale.x;

      // We don't need camera values for unhover, just reset to original position
      setAnimState({
        targetRotationY: 0,
        targetPositionY: position[1],
        targetPositionZ: position[2],
        targetScale: 1,
        animationStartTime: performance.now(),
        isAnimating: true,
        animationDuration: 250, // Fast animation for unhover
        startRotationY: currentRotationY,
        startPositionY: currentPositionY,
        startPositionZ: currentPositionZ,
        startScale: currentScale,
      });
    }

    // Recalculate camera values if card is hovered and not animating
    // This ensures the card stays properly oriented even when camera moves
    if (isHovered.current && !animState.isAnimating && globalHoveredCardId.current === event.id) {
      const { angle, zoomFactor, moveDistance } = calculateCameraValues();

      // Only start a new animation if values have changed significantly
      const currentRotationY = groupRef.current.rotation.y;
      const currentScale = groupRef.current.scale.x;
      const currentPositionZ = groupRef.current.position.z;

      const rotationDiff = Math.abs(currentRotationY - angle);
      const scaleDiff = Math.abs(currentScale - zoomFactor);
      const positionZDiff = Math.abs(currentPositionZ - (position[2] - moveDistance));

      // If any value has changed significantly, update the animation
      if (rotationDiff > 0.1 || scaleDiff > 0.1 || positionZDiff > 0.1) {
        setAnimState({
          targetRotationY: angle,
          targetPositionY: position[1] + 0.5,
          targetPositionZ: position[2] - moveDistance,
          targetScale: zoomFactor,
          animationStartTime: performance.now(),
          isAnimating: true,
          animationDuration: 300, // Medium speed for camera tracking updates
          startRotationY: currentRotationY,
          startPositionY: groupRef.current.position.y,
          startPositionZ: currentPositionZ,
          startScale: currentScale,
        });
      }
    }

    if (animState.isAnimating) {
      // Calculate animation progress
      const elapsedTime = performance.now() - animState.animationStartTime;
      const progress = Math.min(elapsedTime / animState.animationDuration, 1);

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

      const newPositionY = MathUtils.lerp(
        animState.startPositionY,
        animState.targetPositionY,
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
      groupRef.current.position.y = newPositionY;
      groupRef.current.position.z = newPositionZ;
      groupRef.current.scale.set(newScale, newScale, newScale);

      // End animation when complete
      if (progress >= 1) {
        setAnimState(prev => ({ ...prev, isAnimating: false }));

        // If this was a hover animation, update the hover animation state
        if (isHovered.current) {
          // Animation to hover state is complete
          console.debug(`Hover animation complete for ${event.id}`);

          // Keep the hover animation state active for the debounce period
          // This will prevent immediate unhover if the mouse moves off during animation
          setTimeout(() => {
            // Only clear the animation flag if this card is still the hovered one
            if (globalHoveredCardId.current === event.id) {
              hoverDebounce.isInHoverAnimation = false;
              console.debug(`Hover animation debounce complete for ${event.id}`);
            }
          }, hoverDebounce.debounceTime / 2); // Use half the debounce time for animation completion
        } else {
          // Animation to unhovered state is complete
          hoverDebounce.isInHoverAnimation = false;
          console.debug(`Unhover animation complete for ${event.id}`);
        }
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

    // If camera is moving, ignore hover events
    if (hoverDebounce.isCameraMoving) {
      console.debug(`Ignoring hover on ${event.id}, camera is moving`);
      return;
    }

    // Store current mouse position
    hoverDebounce.lastMousePosition = { x: e.clientX, y: e.clientY };

    // Check if we're already in a hover animation or if enough time has passed since last hover change
    const now = performance.now();
    const timeSinceLastChange = now - hoverDebounce.lastHoverChangeTime;

    // If we're already hovering this card, do nothing
    if (globalHoveredCardId.current === event.id) {
      return;
    }

    // If we're in a hover animation or not enough time has passed, ignore this hover
    if (hoverDebounce.isInHoverAnimation && timeSinceLastChange < hoverDebounce.debounceTime) {
      console.debug(`Ignoring hover on ${event.id}, animation in progress`);
      return;
    }

    // Update hover state
    hoverDebounce.lastHoverChangeTime = now;
    hoverDebounce.isInHoverAnimation = true;

    if (onHover) {
      console.debug(`Setting hover on ${event.id}`);
      onHover(event.id);
    }
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();

    // If we're in a hover animation and not enough time has passed, ignore this hover-out
    const now = performance.now();
    const timeSinceLastChange = now - hoverDebounce.lastHoverChangeTime;

    // Calculate distance moved from last hover position
    const distanceMoved = Math.sqrt(
      Math.pow(e.clientX - hoverDebounce.lastMousePosition.x, 2) +
      Math.pow(e.clientY - hoverDebounce.lastMousePosition.y, 2)
    );

    // If the mouse hasn't moved much and we're still in animation, ignore this hover-out
    // This prevents the card from unhovering when it moves under the mouse
    if (
      hoverDebounce.isInHoverAnimation &&
      timeSinceLastChange < hoverDebounce.debounceTime &&
      distanceMoved < 50 // Threshold for mouse movement (in pixels)
    ) {
      console.debug(`Ignoring hover-out on ${event.id}, animation in progress`);
      return;
    }

    // Update hover state
    if (globalHoveredCardId.current === event.id) {
      hoverDebounce.lastHoverChangeTime = now;
      hoverDebounce.isInHoverAnimation = false;

      if (onHover) {
        console.debug(`Clearing hover on ${event.id}`);
        onHover(null);
      }
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
