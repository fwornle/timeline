import { useRef, useEffect, useState, useCallback, memo, useMemo } from 'react';
import { Text } from '@react-three/drei';
import { Group, Vector3, PerspectiveCamera, MathUtils } from 'three';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import type { TimelineEvent, GitTimelineEvent, SpecTimelineEvent } from '../../data/types/TimelineEvent';
import type { SpringConfig } from '../../animation/transitions';
import { dimensions, threeColors, threeOpacities } from '../../config';
import {
  globalClickHandlers
} from '../../utils/three/cardUtils';


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
  wiggle?: boolean;
  isMarkerDragging?: boolean;
  isTimelineHovering?: boolean;
  droneMode?: boolean;
  isHovered?: boolean; // Explicit hover state from parent
}



// Simplified global state for camera movement tracking
const cameraState = {
  // Track if camera is moving (to disable hover effects)
  isCameraMoving: false,
  // Last time camera moved
  lastCameraMoveTime: 0,
  // Camera movement cooldown (ms)
  cameraCooldownTime: 200,
};

// Global mouse position tracking for hover debouncing
const mouseState = {
  // Current mouse position
  x: 0,
  y: 0,
  // Last recorded mouse position
  lastX: 0,
  lastY: 0,
  // Time when mouse last moved significantly
  lastMoveTime: 0,
  // Threshold for significant mouse movement (pixels)
  moveThreshold: 5,
  // Time to wait before considering mouse "settled" (ms)
  settleTime: 100,
};

// Update mouse position tracking
const updateMousePosition = (clientX: number, clientY: number) => {
  const now = performance.now();
  const deltaX = Math.abs(clientX - mouseState.lastX);
  const deltaY = Math.abs(clientY - mouseState.lastY);

  // Check if mouse moved significantly
  if (deltaX > mouseState.moveThreshold || deltaY > mouseState.moveThreshold) {
    mouseState.lastMoveTime = now;
    mouseState.lastX = clientX;
    mouseState.lastY = clientY;
  }

  mouseState.x = clientX;
  mouseState.y = clientY;
};

// Check if mouse has been stable (not moving significantly)
const isMouseStable = () => {
  const now = performance.now();
  return (now - mouseState.lastMoveTime) > mouseState.settleTime;
};

const TimelineCardComponent: React.FC<TimelineCardProps> = ({
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
  },
  wiggle = false,
  isMarkerDragging = false,
  isTimelineHovering = false,
  droneMode = false,
  isHovered = false
}) => {

  // Get camera for proper rotation calculation and movement tracking
  const { camera } = useThree();
  const prevCameraPosition = useRef(camera.position.clone());

  // Check for camera movement on each frame
  const lastCameraCheckRef = useRef(0);
  useFrame(() => {
    const now = performance.now();

    // Only check camera movement every 100ms (~10fps) to reduce performance impact
    if (now - lastCameraCheckRef.current < 100) {
      return;
    }
    lastCameraCheckRef.current = now;

    // Calculate distance moved
    const distanceMoved = camera.position.distanceTo(prevCameraPosition.current);

    // If camera moved significantly
    if (distanceMoved > 0.05) {
      // Mark camera as moving
      cameraState.isCameraMoving = true;
      cameraState.lastCameraMoveTime = now;

      // If this card is hovered and camera is moving, clear hover state
      if (isHovered && onHover) {
        onHover(null);
      }
    } else {
      // Check if camera cooldown period has passed
      if (cameraState.isCameraMoving &&
          (now - cameraState.lastCameraMoveTime) > cameraState.cameraCooldownTime) {
        cameraState.isCameraMoving = false;
      }
    }

    // Update previous position
    prevCameraPosition.current.copy(camera.position);
  });

  // Refs for animation
  const groupRef = useRef<Group>(null);
  const prevHoveredRef = useRef(false);

  // Track if we need to check for delayed hover clearing
  const pendingHoverClearRef = useRef(false);

  // Track animation completion to prevent getting stuck
  const animationCompletionRef = useRef<{
    targetState: 'open' | 'closed';
    mustComplete: boolean;
  }>({ targetState: 'closed', mustComplete: false });

  // Animation state with two-stage animation support
  const [animState, setAnimState] = useState({
    // Target values for animation
    targetRotationY: 0,
    targetPositionX: position[0],
    targetPositionY: position[1],
    targetPositionZ: position[2],
    targetScale: 1,

    // Animation timing
    animationStartTime: 0,
    isAnimating: false,
    animationDuration: 250, // Default animation duration in ms

    // Two-stage animation support
    isFirstStage: true, // true = slide out, false = swirl and zoom
    firstStageDuration: 200, // Duration for slide out phase
    secondStageDuration: 400, // Duration for swirl and zoom phase

    // Starting values for smooth interpolation
    startRotationY: 0,
    startPositionX: position[0],
    startPositionY: position[1],
    startPositionZ: position[2],
    startScale: 1,

    // Intermediate values (after first stage)
    intermediatePositionX: position[0],
    intermediatePositionY: position[1],
    intermediatePositionZ: position[2],
  });

  // Wiggle animation state
  const [wiggleState, setWiggleState] = useState({
    isWiggling: false,
    startTime: 0,
    wiggleAngle: 0,
  });

  // Register/unregister this card with the global click handler
  useEffect(() => {
    // Register this card
    globalClickHandlers.activeCards.add(event.id);

    // Create a clear hover callback specific to this card
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const clearHover = (_: string | null) => {
      if (onHover) {
        onHover(null);
      }
    };

    // Store the clear hover callback
    globalClickHandlers.clearHoverCallbacks.add(clearHover);

    // Set up document listener if needed
    globalClickHandlers.setupDocumentListener();

    // Cleanup on unmount
    return () => {
      globalClickHandlers.activeCards.delete(event.id);
      globalClickHandlers.clearHoverCallbacks.delete(clearHover);

      // Clean up document listener if no more cards
      globalClickHandlers.cleanupDocumentListener();
    };
  }, [event.id, onHover]);

  // Trigger wiggle animation when 'wiggle' prop changes to true
  useEffect(() => {
    if (wiggle) {
      setWiggleState({ isWiggling: true, startTime: performance.now(), wiggleAngle: 0 });
    }
  }, [wiggle, setWiggleState]);

  // Wiggle animation frame (throttled for performance)
  const lastWiggleUpdateRef = useRef(0);
  useFrame(() => {
    if (!groupRef.current || !wiggleState.isWiggling) return;

    const now = performance.now();

    // Only update wiggle animation every 16ms (~60fps) to reduce performance impact
    if (now - lastWiggleUpdateRef.current < 16) {
      return;
    }
    lastWiggleUpdateRef.current = now;

    const elapsed = now - wiggleState.startTime;
    const duration = 400; // longer wiggle for more pronounced effect
    if (elapsed < duration) {
      // Wiggle: quick left-right rotation (Y axis) with more pronounced motion
      // Use Math.sin directly as this is a simple calculation, not an interpolation
      const progress = elapsed / duration;

      // Create a more dramatic wiggle with varying amplitude
      // Start strong, then fade out for a more natural feel
      const fadeOut = 1 - (progress * progress); // Quadratic fade out
      const wiggleAngle = Math.sin(progress * Math.PI * 6) * 0.35 * fadeOut; // 3 full wiggles with higher amplitude

      setWiggleState((prev) => ({ ...prev, wiggleAngle }));
    } else {
      // End wiggle
      setWiggleState({ isWiggling: false, startTime: 0, wiggleAngle: 0 });
    }
  });

  // Calculate camera-related values for animation
  const calculateCameraValues = useCallback(() => {
    if (!groupRef.current) return { angle: 0, distance: 10, zoomFactor: 1.5, moveDistance: 1.0 };

    // Get card position in world space
    const cardPosition = new Vector3(position[0], position[1], position[2]);

    // Get camera position
    const cameraPosition = camera.position.clone();

    // Calculate direction from card to camera (in 3D space for more accurate facing)
    const direction = new Vector3(
      cameraPosition.x - cardPosition.x,
      cameraPosition.y - cardPosition.y,
      cameraPosition.z - cardPosition.z
    ).normalize();

    // Project the direction onto the XZ plane for Y rotation
    const xzDirection = new Vector3(direction.x, 0, direction.z).normalize();

    // Calculate angle - we want the card to face the camera
    const angle = Math.atan2(xzDirection.x, xzDirection.z);

    // Calculate distance from camera to card
    const distance = cardPosition.distanceTo(cameraPosition);

    // Calculate the camera's field of view in radians
    // Default to 45 degrees if not a perspective camera
    const fovRadians = (camera instanceof PerspectiveCamera)
      ? (camera.fov * Math.PI) / 180
      : (45 * Math.PI) / 180;

    // Calculate the visible height at the card's distance
    // This is the height of the visible area at the card's distance from camera
    const visibleHeight = 2 * Math.tan(fovRadians / 2) * distance;

    // We want the card to take up approximately 1/3 of the visible height
    const targetCardHeight = visibleHeight / 3;

    // Calculate zoom factor needed to achieve this size
    // The card's base height is cardHeight (2.0 units)
    const cardBaseHeight = 2.0;
    const zoomFactor = targetCardHeight / cardBaseHeight;

    // Apply min/max limits to keep the zoom reasonable
    const minZoom = 1.2;
    const maxZoom = 12.0;
    const finalZoomFactor = Math.min(Math.max(zoomFactor, minZoom), maxZoom);

    // Calculate how far to move the card toward the camera
    // We want to move it forward enough to be clearly visible but not too close
    const idealViewingDistance = visibleHeight * 1.5; // Keep it at a comfortable viewing distance
    const currentViewingDistance = distance;
    const moveDistance = Math.max(0, currentViewingDistance - idealViewingDistance);

    // Clamp move distance to reasonable limits
    const maxMoveDistance = distance * 0.7; // Don't move more than 70% closer
    const finalMoveDistance = Math.min(moveDistance, maxMoveDistance);

    return {
      angle,
      distance,
      zoomFactor: finalZoomFactor,
      moveDistance: finalMoveDistance
    };
  }, [position, camera, groupRef]);

  // Update hover state when animation props change
  useEffect(() => {
    // Use explicit hover state from parent instead of inferring from scale
    const newIsHovered = isHovered;

    // Only trigger animation if hover state changed
    if (newIsHovered !== prevHoveredRef.current) {
      // Animation props changed
      prevHoveredRef.current = newIsHovered;

      // Store current values as starting point
      const currentRotationY = groupRef.current?.rotation.y || 0;
      const currentPositionX = groupRef.current?.position.x || position[0];
      const currentPositionY = groupRef.current?.position.y || position[1];
      const currentPositionZ = groupRef.current?.position.z || position[2];
      const currentScale = groupRef.current?.scale.x || 1;

      // Get camera-dependent values
      const { angle, zoomFactor, moveDistance } = calculateCameraValues();

      if (newIsHovered) {
        // HOVER: Start two-stage animation
        animationCompletionRef.current = { targetState: 'open', mustComplete: true };

        const cardWidth = dimensions.card.width;
        const cardHeight = dimensions.card.height;

        // Calculate perpendicular direction to timeline (timeline runs along Z-axis)
        // We want to move away from the timeline, which means moving in the X direction
        const awayFromTimeline = new Vector3(1, 0, 0); // Move in X direction (perpendicular to timeline)

        // Determine which side to move to (positive or negative X) based on card position
        // Cards on the left side of timeline should move left, cards on right should move right
        const sideMultiplier = position[0] >= 0 ? 1 : -1; // Move away from center

        // Stage 1: Slide away from timeline and up (no rotation or zoom yet)
        const slideDistance = cardWidth * 0.5; // Half card width away from timeline
        const upDistance = cardHeight * 0.5; // Half card height up

        const intermediateX = position[0] + (awayFromTimeline.x * slideDistance * sideMultiplier);
        const intermediateY = position[1] + upDistance;
        const intermediateZ = position[2]; // No Z movement in first stage

        // Start first stage animation
        setAnimState({
          targetRotationY: 0, // No rotation in first stage
          targetPositionX: intermediateX,
          targetPositionY: intermediateY,
          targetPositionZ: intermediateZ,
          targetScale: 1, // No scaling in first stage
          animationStartTime: performance.now(),
          isAnimating: true,
          isFirstStage: true,
          firstStageDuration: 200,
          secondStageDuration: 400,
          startRotationY: currentRotationY,
          startPositionX: currentPositionX,
          startPositionY: currentPositionY,
          startPositionZ: currentPositionZ,
          startScale: currentScale,
          // Store final targets for second stage
          intermediatePositionX: intermediateX,
          intermediatePositionY: intermediateY,
          intermediatePositionZ: intermediateZ,
          animationDuration: 200, // First stage duration
        });

        // We'll set up the second stage when the first stage completes
      } else {
        // UNHOVER: Return to original position (single stage)
        animationCompletionRef.current = { targetState: 'closed', mustComplete: true };

        const targetRotationY = 0;
        const targetPositionX = position[0];
        const targetPositionY = position[1];
        const targetPositionZ = position[2];
        const targetScale = 1;

        setAnimState({
          targetRotationY,
          targetPositionX,
          targetPositionY,
          targetPositionZ,
          targetScale,
          animationStartTime: performance.now(),
          isAnimating: true,
          isFirstStage: false, // Single stage unhover
          firstStageDuration: 300,
          secondStageDuration: 0,
          startRotationY: currentRotationY,
          startPositionX: currentPositionX,
          startPositionY: currentPositionY,
          startPositionZ: currentPositionZ,
          startScale: currentScale,
          intermediatePositionX: currentPositionX,
          intermediatePositionY: currentPositionY,
          intermediatePositionZ: currentPositionZ,
          animationDuration: 300,
        });
      }
    }
  }, [isHovered, calculateCameraValues, position]);

  // Animation frame (throttled for performance)
  const lastAnimationUpdateRef = useRef(0);
  useFrame(() => {
    if (!groupRef.current) return;

    const now = performance.now();

    // Only update animation every 16ms (~60fps) to reduce performance impact
    if (now - lastAnimationUpdateRef.current < 16) {
      return;
    }
    lastAnimationUpdateRef.current = now;

    // Recalculate camera values if card is hovered and not animating
    // This ensures the card stays properly oriented even when camera moves
    if (isHovered && !animState.isAnimating) {
      const { angle, zoomFactor, moveDistance } = calculateCameraValues();

      // Only start a new animation if values have changed significantly
      const currentRotationY = groupRef.current.rotation.y;
      const currentPositionX = groupRef.current.position.x;
      const currentScale = groupRef.current.scale.x;
      const currentPositionZ = groupRef.current.position.z;

      const rotationDiff = Math.abs(currentRotationY - angle);
      const scaleDiff = Math.abs(currentScale - zoomFactor);
      const positionZDiff = Math.abs(currentPositionZ - (position[2] - moveDistance));

      // If any value has changed significantly, update the animation
      if (rotationDiff > 0.1 || scaleDiff > 0.1 || positionZDiff > 0.1) {
        setAnimState({
          targetRotationY: angle,
          targetPositionX: position[0], // No side offset for camera tracking updates
          targetPositionY: position[1] + 0.5,
          targetPositionZ: position[2] - moveDistance,
          targetScale: zoomFactor,
          animationStartTime: now,
          isAnimating: true,
          isFirstStage: false, // Camera tracking is single stage
          firstStageDuration: 300,
          secondStageDuration: 0,
          animationDuration: 300, // Medium speed for camera tracking updates
          startRotationY: currentRotationY,
          startPositionX: currentPositionX,
          startPositionY: groupRef.current.position.y,
          startPositionZ: currentPositionZ,
          startScale: currentScale,
          intermediatePositionX: currentPositionX,
          intermediatePositionY: groupRef.current.position.y,
          intermediatePositionZ: currentPositionZ,
        });
      }
    }

    if (animState.isAnimating) {
      // Calculate animation progress using cached now value
      const elapsedTime = now - animState.animationStartTime;

      if (animState.isFirstStage && isHovered) {
        // FIRST STAGE: Slide out animation
        const progress = Math.min(elapsedTime / animState.firstStageDuration, 1);

        // Easing function (ease-out for smooth slide)
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        // Interpolate values for first stage (slide out)
        const newPositionX = MathUtils.lerp(
          animState.startPositionX,
          animState.targetPositionX,
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

        // No rotation or scaling in first stage
        const newRotationY = animState.startRotationY;
        const newScale = animState.startScale;

        // Apply values
        groupRef.current.rotation.y = newRotationY;
        groupRef.current.position.x = newPositionX;
        groupRef.current.position.y = newPositionY;
        groupRef.current.position.z = newPositionZ;
        groupRef.current.scale.set(newScale, newScale, newScale);

        // Check if first stage is complete
        if (progress >= 1) {
          // Start second stage: swirl and zoom
          const { angle, zoomFactor, moveDistance } = calculateCameraValues();

          setAnimState(prev => ({
            ...prev,
            isFirstStage: false,
            animationStartTime: now,
            animationDuration: prev.secondStageDuration,
            // Update start values to current position (end of first stage)
            startRotationY: newRotationY,
            startPositionX: newPositionX,
            startPositionY: newPositionY,
            startPositionZ: newPositionZ,
            startScale: newScale,
            // Set final targets for second stage
            targetRotationY: angle,
            targetPositionX: prev.intermediatePositionX, // Stay at slid-out position
            targetPositionY: prev.intermediatePositionY + 0.5, // Additional lift
            targetPositionZ: position[2] - moveDistance, // Move toward camera
            targetScale: zoomFactor,
          }));
          // First stage completed, but second stage must still complete
          // Don't set mustComplete to false yet
        }
      } else {
        // SECOND STAGE or SINGLE STAGE: Swirl and zoom (or unhover)
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

        const newPositionX = MathUtils.lerp(
          animState.startPositionX,
          animState.targetPositionX,
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
        groupRef.current.position.x = newPositionX;
        groupRef.current.position.y = newPositionY;
        groupRef.current.position.z = newPositionZ;
        groupRef.current.scale.set(newScale, newScale, newScale);

        // End animation when complete
        if (progress >= 1) {
          setAnimState(prev => ({ ...prev, isAnimating: false }));
          // Mark animation as completed
          animationCompletionRef.current.mustComplete = false;
        }
      }
    }

    // Check for delayed hover clearing when mouse becomes stable
    if (pendingHoverClearRef.current && isMouseStable() && isHovered) {
      pendingHoverClearRef.current = false;
      if (onHover) {
        onHover(null);
      }
    }
  });

  // Event handlers
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    // Clicking on a card should both select it AND open it (hover)
    // This ensures cards can be opened even if hover detection is having issues

    // First, select the card (yellow frame)
    if (onSelect) {
      onSelect(event.id);
    }

    // Then, open the card (hover state) - simplified conditions
    if (!isMarkerDragging && !droneMode) {
      if (onHover) {
        onHover(event.id);
      }
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();

    // Update mouse position tracking
    updateMousePosition(e.nativeEvent.clientX, e.nativeEvent.clientY);

    // Simplified hover logic - only block for essential conditions
    // If marker is being dragged, ignore hover events
    if (isMarkerDragging) {
      return;
    }

    // If drone mode is active, ignore hover events
    if (droneMode) {
      return;
    }

    // Clear any pending hover clear since we're hovering again
    pendingHoverClearRef.current = false;

    // Simply notify parent - it will handle exclusivity
    if (onHover) {
      onHover(event.id);
    }
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();

    // Update mouse position tracking
    updateMousePosition(e.nativeEvent.clientX, e.nativeEvent.clientY);

    // Simplified pointer out - use mouse stability check but don't block for animations
    // Only clear hover if mouse has been stable (not moving due to card animation)
    if (isMouseStable()) {
      // Simply notify parent to clear hover
      if (onHover) {
        onHover(null);
      }
    } else {
      // Mark that we need to check for delayed hover clearing
      pendingHoverClearRef.current = true;
    }
  };

  // Get card colors and dimensions from configuration
  const cardColors = event.type === 'git' ? threeColors.cards.git : threeColors.cards.spec;
  const cardOpacities = event.type === 'git' ? threeOpacities.cards.git : threeOpacities.cards.spec;

  // Memoize text content to prevent font reprocessing during animations
  const textContent = useMemo(() => {
    const headerText = event.type === 'git' ? 'GIT COMMIT' : 'SPEC CHANGE';
    const mainText = event.title.length > 80 ? event.title.substring(0, 80) + '...' : event.title;
    const typeText = event.type === 'git' ? 'Commit' : 'Spec';
    const dateText = event.timestamp.toLocaleDateString();

    let statsLine1 = '';
    let statsLine2 = '';

    if (event.type === 'git') {
      const gitEvent = event as GitTimelineEvent;
      statsLine1 = `Files: +${gitEvent.stats?.filesAdded ?? gitEvent.stats?.filesCreated ?? 0} ~${gitEvent.stats?.filesModified ?? 0} -${gitEvent.stats?.filesDeleted ?? 0}`;
      statsLine2 = `Lines: +${gitEvent.stats?.linesAdded ?? 0} -${gitEvent.stats?.linesDeleted ?? 0}`;
    } else {
      const specEvent = event as SpecTimelineEvent;
      statsLine1 = `Prompts: ${specEvent.stats?.promptCount ?? 0} | Tools: ${specEvent.stats?.toolInvocations ?? 0}`;
      statsLine2 = `Files: ${specEvent.stats?.filesCreated ?? 0} | Lines: +${specEvent.stats?.linesAdded ?? 0}`;
    }

    return {
      headerText,
      mainText,
      typeText,
      dateText,
      statsLine1,
      statsLine2
    };
  }, [event.type, event.title, event.timestamp, event]);
  const cardWidth = dimensions.card.width;
  const cardHeight = dimensions.card.height;

  // We don't need this function anymore as we're rendering stats directly in the JSX

  return (
    <group
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      rotation={[animationProps.rotation[0], (animationProps.rotation[1] || 0) + (wiggleState.wiggleAngle || 0), animationProps.rotation[2] || 0]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Card shadow */}
      <mesh position={[
        dimensions.card.shadowOffset.x,
        dimensions.card.shadowOffset.y,
        dimensions.card.shadowOffset.z
      ]} receiveShadow>
        <boxGeometry args={[cardWidth, cardHeight, dimensions.card.shadowDepth]} />
        <meshStandardMaterial
          color={cardColors.shadow}
          roughness={1}
          metalness={0}
          transparent
          opacity={cardOpacities.shadow}
        />
      </mesh>

      {/* Card background */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[cardWidth, cardHeight, dimensions.card.depth]} />
        <meshStandardMaterial
          color={cardColors.background}
          roughness={0.4}
          metalness={0.3}
          transparent
          opacity={cardOpacities.background}
        />
      </mesh>

      {/* Card content */}
      <group position={[0, 0, dimensions.card.contentOffset.z]}>
        {/* Header bar */}
        <mesh position={[0, dimensions.card.header.yPosition, 0]}>
          <planeGeometry args={[cardWidth, dimensions.card.header.height]} />
          <meshBasicMaterial
            color={cardColors.header}
            transparent
            opacity={0.9}
          />
        </mesh>

        {/* Header title */}
        <Text
          position={[
            dimensions.typography.card.headerTitle.position.x,
            dimensions.typography.card.headerTitle.position.y,
            dimensions.typography.card.headerTitle.position.z
          ]}
          fontSize={dimensions.typography.card.headerTitle.fontSize}
          color={cardColors.text}
          anchorX="left"
          anchorY="middle"
          fontWeight="bold"
        >
          {textContent.headerText}
        </Text>

        {/* Main content - left-justified with proper padding */}
        <Text
          position={[-1.3, 0.6, 0]} // Left-aligned with top padding
          fontSize={0.22}
          maxWidth={2.5}
          lineHeight={1.3}
          textAlign="left"
          color="#ffffff"
          anchorX="left"
          anchorY="top"
          overflowWrap="break-word"
        >
          {textContent.mainText}
        </Text>

        {/* Bottom bar with type and date */}
        <mesh position={[0, -0.95, 0]}>
          <planeGeometry args={[cardWidth, 0.4]} />
          <meshBasicMaterial
            color="#1a1a1a"
            transparent
            opacity={0.7}
          />
        </mesh>

        {/* Type indicator - bottom left */}
        <Text
          position={[
            dimensions.typography.card.typeIndicator.position.x,
            dimensions.typography.card.typeIndicator.position.y,
            dimensions.typography.card.typeIndicator.position.z
          ]}
          fontSize={dimensions.typography.card.typeIndicator.fontSize}
          color={cardColors.accent}
          anchorX="left"
          anchorY="middle"
          fontWeight="bold"
        >
          {textContent.typeText}
        </Text>

        {/* Stats - bottom center - split into two lines for better readability */}
        <group position={[0, -0.95, 0.01]}>
          <Text
            position={[0, 0.15, 0]}
            fontSize={0.11}
            color="#e0e0e0"
            anchorX="center"
            anchorY="middle"
          >
            {textContent.statsLine1}
          </Text>
          <Text
            position={[0, -0.1, 0]}
            fontSize={0.11}
            color="#e0e0e0"
            anchorX="center"
            anchorY="middle"
          >
            {textContent.statsLine2}
          </Text>
        </group>

        {/* Date - bottom right */}
        <Text
          position={[
            dimensions.typography.card.dateText.position.x,
            dimensions.typography.card.dateText.position.y,
            dimensions.typography.card.dateText.position.z
          ]}
          fontSize={dimensions.typography.card.dateText.fontSize}
          color={cardColors.text}
          anchorX="right"
          anchorY="middle"
        >
          {textContent.dateText}
        </Text>
      </group>

      {/* Selection indicator */}
      {selected && (
        <mesh position={[0, 0, dimensions.card.selection.zOffset]}>
          <boxGeometry args={[
            cardWidth + dimensions.card.selection.padding,
            cardHeight + dimensions.card.selection.padding,
            dimensions.card.selection.depth
          ]} />
          <meshBasicMaterial color={threeColors.warning} />
        </mesh>
      )}


    </group>
  );
};

// Export memoized version to prevent unnecessary re-renders and reduce font processing
export const TimelineCard = memo(TimelineCardComponent, (prevProps, nextProps) => {
  // Be extremely aggressive about preventing re-renders to stop font processing errors
  // Only re-render if critical visual props changed
  return (
    prevProps.event.id === nextProps.event.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.wiggle === nextProps.wiggle &&
    prevProps.isMarkerDragging === nextProps.isMarkerDragging &&
    // Only re-render for significant position changes (>0.1 units)
    Math.abs((prevProps.position?.[0] || 0) - (nextProps.position?.[0] || 0)) < 0.1 &&
    Math.abs((prevProps.position?.[1] || 0) - (nextProps.position?.[1] || 0)) < 0.1 &&
    Math.abs((prevProps.position?.[2] || 0) - (nextProps.position?.[2] || 0)) < 0.1 &&
    // Only re-render for significant scale changes (>0.1)
    Math.abs((prevProps.animationProps?.scale || 1) - (nextProps.animationProps?.scale || 1)) < 0.1
  );
});

