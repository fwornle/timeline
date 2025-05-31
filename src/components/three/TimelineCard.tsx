import { useRef, useEffect, useState, useCallback, memo, useMemo } from 'react';
import { Group, Vector3, PerspectiveCamera, MathUtils } from 'three';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { SafeText } from './SafeText';
import type { TimelineEvent, GitTimelineEvent, SpecTimelineEvent } from '../../data/types/TimelineEvent';
import type { SpringConfig } from '../../animation/transitions';
import { dimensions, threeColors, threeOpacities } from '../../config';
import { useLogger } from '../../utils/logging/hooks/useLogger';
import {
  globalClickHandlers,
  registerOpenCard,
  unregisterOpenCard,
  registerAnimatingCard,
  unregisterAnimatingCard,
  addForceCloseCallback,
  removeForceCloseCallback
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
  droneMode?: boolean;
  isHovered?: boolean; // Explicit hover state from parent
  fadeOpacity?: number; // Opacity for occlusion handling
  debugMarker?: boolean; // Debug marker for occlusion detection
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
  droneMode = false,
  isHovered = false,
  fadeOpacity = 1.0,
  debugMarker = false
}) => {
  const logger = useLogger({ component: 'THREE', topic: 'cards' });

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

  // Track animation completion to prevent getting stuck and ensure exclusivity
  const animationCompletionRef = useRef<{
    targetState: 'open' | 'closed';
    mustComplete: boolean;
    cardId: string;
  }>({ targetState: 'closed', mustComplete: false, cardId: '' });

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

  // Fade animation state for occlusion handling
  const [currentOpacity, setCurrentOpacity] = useState(1.0);
  const fadeAnimationRef = useRef<{
    startTime: number;
    startOpacity: number;
    targetOpacity: number;
    isAnimating: boolean;
  }>({
    startTime: 0,
    startOpacity: 1.0,
    targetOpacity: 1.0,
    isAnimating: false
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

    // Create a force close callback specific to this card
    const forceClose = (cardId: string) => {
      if (cardId === event.id && onHover) {
        // Force closing card
        onHover(null);
      }
    };

    // Store the callbacks
    globalClickHandlers.clearHoverCallbacks.add(clearHover);
    addForceCloseCallback(forceClose);

    // Set up document listener if needed
    globalClickHandlers.setupDocumentListener();

    // Cleanup on unmount
    return () => {
      globalClickHandlers.activeCards.delete(event.id);
      globalClickHandlers.clearHoverCallbacks.delete(clearHover);
      removeForceCloseCallback(forceClose);

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

  // Direct opacity update when fadeOpacity changes (no animation)
  useEffect(() => {
    if (Math.abs(currentOpacity - fadeOpacity) > 0.01) {
      logger.debug('Direct opacity update:', {
        cardId: event.id.slice(-6),
        currentOpacity,
        fadeOpacity
      });
      
      setCurrentOpacity(fadeOpacity);
    }
  }, [fadeOpacity, currentOpacity, event.id, logger]);


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

    // Fade animation disabled - using direct opacity updates instead
    // if (fadeAnimationRef.current.isAnimating) {
    //   const fadeConfig = (dimensions.animation.card as any).occlusion;
    //   const elapsed = now - fadeAnimationRef.current.startTime;
    //   const progress = Math.min(elapsed / fadeConfig.fadeAnimationDuration, 1);
    //   
    //   // Smooth easing
    //   const easedProgress = progress < 0.5 
    //     ? 2 * progress * progress 
    //     : 1 - 2 * (1 - progress) * (1 - progress);
    //   
    //   const newOpacity = MathUtils.lerp(
    //     fadeAnimationRef.current.startOpacity,
    //     fadeAnimationRef.current.targetOpacity,
    //     easedProgress
    //   );
    //   
    //   setCurrentOpacity(newOpacity);
    //   
    //   if (progress >= 1) {
    //     fadeAnimationRef.current.isAnimating = false;
    //   }
    // }
  });

  // Calculate optimal card positioning considering camera, viewport, and nearby objects
  const calculateOptimalPosition = useCallback(() => {
    if (!groupRef.current) return { 
      angle: 0, 
      distance: 10, 
      zoomFactor: 1.5, 
      optimalPosition: new Vector3(position[0], position[1], position[2])
    };

    // Get card position in world space
    const cardPosition = new Vector3(position[0], position[1], position[2]);
    const cameraPosition = camera.position.clone();

    // Calculate direction from card to camera
    const toCameraDirection = new Vector3()
      .subVectors(cameraPosition, cardPosition)
      .normalize();

    // Calculate angle for card to face camera
    const xzDirection = new Vector3(toCameraDirection.x, 0, toCameraDirection.z).normalize();
    const angle = Math.atan2(xzDirection.x, xzDirection.z);

    // Calculate distance from camera to card
    const distance = cardPosition.distanceTo(cameraPosition);

    // Get smart positioning config
    const config = dimensions.animation.card.smartPositioning;
    const cardWidth = dimensions.card.width;
    const cardHeight = dimensions.card.height;

    // Calculate camera FOV and viewport dimensions at card distance
    const fovRadians = (camera instanceof PerspectiveCamera)
      ? (camera.fov * Math.PI) / 180
      : (45 * Math.PI) / 180;

    const visibleHeight = 2 * Math.tan(fovRadians / 2) * distance;
    const visibleWidth = visibleHeight * (camera.aspect || 1);

    // Calculate optimal scale (card should take ~1/3 of visible height)
    const targetCardHeight = visibleHeight / 3;
    const zoomFactor = Math.min(Math.max(targetCardHeight / cardHeight, 1.2), 8.0);

    // Calculate forward movement toward camera
    const forwardDistance = Math.max(
      config.minForwardDistance,
      distance * config.forwardRatio
    );

    // Calculate the viewport bounds in world space at the new distance
    const newDistance = distance - forwardDistance;
    const newVisibleHeight = 2 * Math.tan(fovRadians / 2) * newDistance;
    const newVisibleWidth = newVisibleHeight * (camera.aspect || 1);

    // Calculate viewport margins
    const marginH = newVisibleWidth * config.viewportMargin;
    const marginV = newVisibleHeight * config.viewportMargin;

    // Project camera direction to find viewport bounds relative to camera
    const cameraForward = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const cameraRight = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const cameraUp = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    // Calculate the center point of the viewport at the new distance
    const viewportCenter = new Vector3()
      .copy(cameraPosition)
      .add(cameraForward.clone().multiplyScalar(newDistance));

    // Calculate viewport bounds in world space
    const viewportHalfWidth = (newVisibleWidth / 2) - marginH;
    const viewportHalfHeight = (newVisibleHeight / 2) - marginV;

    // Start with position moved toward camera
    const baseNewPosition = new Vector3()
      .copy(cardPosition)
      .add(toCameraDirection.clone().multiplyScalar(forwardDistance));

    // Add upward lift
    baseNewPosition.y += config.liftDistance;

    // Check if card would be within viewport bounds at this position
    // Project the card position relative to viewport center
    const cardRelativeToViewport = new Vector3().subVectors(baseNewPosition, viewportCenter);
    
    // Calculate card position in viewport coordinates
    const cardViewportX = cardRelativeToViewport.dot(cameraRight);
    const cardViewportY = cardRelativeToViewport.dot(cameraUp);

    // Calculate scaled card dimensions
    const scaledCardWidth = cardWidth * zoomFactor;
    const scaledCardHeight = cardHeight * zoomFactor;

    // Add extra padding for high zoom scenarios
    const extraPadding = config.extraViewportPadding;
    const effectiveHalfWidth = viewportHalfWidth - extraPadding;
    const effectiveHalfHeight = viewportHalfHeight - extraPadding;

    // Clamp card position to stay within viewport bounds with extra padding
    const clampedX = Math.max(
      -effectiveHalfWidth + scaledCardWidth / 2,
      Math.min(effectiveHalfWidth - scaledCardWidth / 2, cardViewportX)
    );
    
    const clampedY = Math.max(
      -effectiveHalfHeight + scaledCardHeight / 2,
      Math.min(effectiveHalfHeight - scaledCardHeight / 2, cardViewportY)
    );

    // Convert back to world coordinates
    const clampedWorldPosition = new Vector3()
      .copy(viewportCenter)
      .add(cameraRight.clone().multiplyScalar(clampedX))
      .add(cameraUp.clone().multiplyScalar(clampedY));

    // Ensure we don't move too far from original position (maintain context)
    const offsetFromOriginal = clampedWorldPosition.distanceTo(cardPosition);
    if (offsetFromOriginal > config.maxOffsetDistance) {
      // Scale back the offset to stay within max distance
      const offsetDirection = new Vector3()
        .subVectors(clampedWorldPosition, cardPosition)
        .normalize();
      
      clampedWorldPosition.copy(cardPosition)
        .add(offsetDirection.multiplyScalar(config.maxOffsetDistance));
    }

    return {
      angle,
      distance,
      zoomFactor,
      optimalPosition: clampedWorldPosition
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

      // Get optimal positioning values
      const { angle, zoomFactor, optimalPosition } = calculateOptimalPosition();

      if (newIsHovered) {
        // HOVER: Move to optimal position with swirl/zoom animation
        animationCompletionRef.current = { targetState: 'open', mustComplete: true, cardId: event.id };
        registerAnimatingCard(event.id);

        // Start simultaneous animation to optimal position
        setAnimState({
          targetRotationY: angle,
          targetPositionX: optimalPosition.x,
          targetPositionY: optimalPosition.y,
          targetPositionZ: optimalPosition.z,
          targetScale: zoomFactor,
          animationStartTime: performance.now(),
          isAnimating: true,
          isFirstStage: false, // Single stage with all effects
          firstStageDuration: 600, // Longer duration for smooth combined animation
          secondStageDuration: 0,
          startRotationY: currentRotationY,
          startPositionX: currentPositionX,
          startPositionY: currentPositionY,
          startPositionZ: currentPositionZ,
          startScale: currentScale,
          intermediatePositionX: optimalPosition.x,
          intermediatePositionY: optimalPosition.y,
          intermediatePositionZ: optimalPosition.z,
          animationDuration: 600, // Combined animation duration
        });
      } else {
        // UNHOVER: Return to original position (single stage)
        animationCompletionRef.current = { targetState: 'closed', mustComplete: true, cardId: event.id };
        registerAnimatingCard(event.id);

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
          firstStageDuration: 400,
          secondStageDuration: 0,
          startRotationY: currentRotationY,
          startPositionX: currentPositionX,
          startPositionY: currentPositionY,
          startPositionZ: currentPositionZ,
          startScale: currentScale,
          intermediatePositionX: currentPositionX,
          intermediatePositionY: currentPositionY,
          intermediatePositionZ: currentPositionZ,
          animationDuration: 400,
        });
      }
    }
  }, [isHovered, calculateOptimalPosition, position]);

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

    // Recalculate optimal position if card is hovered and not animating
    // This ensures the card stays properly positioned even when camera moves
    if (isHovered && !animState.isAnimating) {
      const { angle, zoomFactor, optimalPosition } = calculateOptimalPosition();

      // Only start a new animation if values have changed significantly
      const currentRotationY = groupRef.current.rotation.y;
      const currentPositionX = groupRef.current.position.x;
      const currentPositionY = groupRef.current.position.y;
      const currentPositionZ = groupRef.current.position.z;
      const currentScale = groupRef.current.scale.x;

      const rotationDiff = Math.abs(currentRotationY - angle);
      const scaleDiff = Math.abs(currentScale - zoomFactor);
      const positionDiff = new Vector3(currentPositionX, currentPositionY, currentPositionZ)
        .distanceTo(optimalPosition);

      // If any value has changed significantly, update the animation
      if (rotationDiff > 0.1 || scaleDiff > 0.1 || positionDiff > 0.5) {
        setAnimState({
          targetRotationY: angle,
          targetPositionX: optimalPosition.x,
          targetPositionY: optimalPosition.y,
          targetPositionZ: optimalPosition.z,
          targetScale: zoomFactor,
          animationStartTime: now,
          isAnimating: true,
          isFirstStage: false, // Camera tracking is single stage
          firstStageDuration: 300,
          secondStageDuration: 0,
          animationDuration: 300, // Medium speed for camera tracking updates
          startRotationY: currentRotationY,
          startPositionX: currentPositionX,
          startPositionY: currentPositionY,
          startPositionZ: currentPositionZ,
          startScale: currentScale,
          intermediatePositionX: optimalPosition.x,
          intermediatePositionY: optimalPosition.y,
          intermediatePositionZ: optimalPosition.z,
        });
      }
    }

    if (animState.isAnimating) {
      // Calculate animation progress using cached now value
      const elapsedTime = now - animState.animationStartTime;
      const progress = Math.min(elapsedTime / animState.animationDuration, 1);

      // Easing function (ease-in-out for smooth combined animation)
      const easedProgress = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Interpolate all values simultaneously (slide + swirl + zoom)
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
        // Mark animation as completed - this allows other interactions again
        animationCompletionRef.current.mustComplete = false;

        // Unregister card as animating
        unregisterAnimatingCard(event.id);

        // Register/unregister card as open based on target state
        if (animationCompletionRef.current.targetState === 'open') {
          registerOpenCard(event.id);
        } else if (animationCompletionRef.current.targetState === 'closed') {
          unregisterOpenCard(event.id);
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

    // Block clicks if any animation is in progress (exclusive card animations)
    if (animationCompletionRef.current.mustComplete) {
      return;
    }

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

    // Block hover if any animation is in progress (exclusive card animations)
    if (animationCompletionRef.current.mustComplete) {
      return;
    }

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

    // If an animation is in progress that must complete, don't interrupt it
    // The card will complete its opening animation even if mouse moves away
    if (animationCompletionRef.current.mustComplete) {
      return;
    }

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
          opacity={cardOpacities.shadow * currentOpacity}
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
          opacity={cardOpacities.background * currentOpacity}
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
            opacity={0.9 * currentOpacity}
          />
        </mesh>

        {/* Header title */}
        <SafeText
          position={[
            dimensions.typography.card.headerTitle.position.x,
            dimensions.typography.card.headerTitle.position.y,
            dimensions.typography.card.headerTitle.position.z
          ]}
          fontSize={dimensions.typography.card.headerTitle.fontSize}
          color={cardColors.text}
          anchorX="left"
          anchorY="middle"
        >
          {textContent.headerText}
        </SafeText>

        {/* Main content - left-justified with proper padding */}
        <SafeText
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
        </SafeText>

        {/* Bottom bar with type and date */}
        <mesh position={[0, -0.95, 0]}>
          <planeGeometry args={[cardWidth, 0.4]} />
          <meshBasicMaterial
            color="#1a1a1a"
            transparent
            opacity={0.7 * currentOpacity}
          />
        </mesh>

        {/* Type indicator - bottom left */}
        <SafeText
          position={[
            dimensions.typography.card.typeIndicator.position.x,
            dimensions.typography.card.typeIndicator.position.y,
            dimensions.typography.card.typeIndicator.position.z
          ]}
          fontSize={dimensions.typography.card.typeIndicator.fontSize}
          color={cardColors.accent}
          anchorX="left"
          anchorY="middle"
        >
          {textContent.typeText}
        </SafeText>

        {/* Stats - bottom center - split into two lines for better readability */}
        <group position={[0, -0.95, 0.01]}>
          <SafeText
            position={[0, 0.15, 0]}
            fontSize={0.11}
            color="#e0e0e0"
            anchorX="center"
            anchorY="middle"
          >
            {textContent.statsLine1}
          </SafeText>
          <SafeText
            position={[0, -0.1, 0]}
            fontSize={0.11}
            color="#e0e0e0"
            anchorX="center"
            anchorY="middle"
          >
            {textContent.statsLine2}
          </SafeText>
        </group>

        {/* Date - bottom right */}
        <SafeText
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
        </SafeText>
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

      {/* Debug marker for occlusion detection */}
      {debugMarker && (
        <mesh position={[0, 0, dimensions.card.selection.zOffset + 0.02]}>
          <boxGeometry args={[
            cardWidth + 0.4,
            cardHeight + 0.4,
            0.01
          ]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.5} />
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
    prevProps.debugMarker === nextProps.debugMarker &&
    // Only re-render for significant fade opacity changes (>0.05)
    Math.abs((prevProps.fadeOpacity || 1.0) - (nextProps.fadeOpacity || 1.0)) < 0.05 &&
    // Only re-render for significant position changes (>0.1 units)
    Math.abs((prevProps.position?.[0] || 0) - (nextProps.position?.[0] || 0)) < 0.1 &&
    Math.abs((prevProps.position?.[1] || 0) - (nextProps.position?.[1] || 0)) < 0.1 &&
    Math.abs((prevProps.position?.[2] || 0) - (nextProps.position?.[2] || 0)) < 0.1 &&
    // Only re-render for significant scale changes (>0.1)
    Math.abs((prevProps.animationProps?.scale || 1) - (nextProps.animationProps?.scale || 1)) < 0.1
  );
});

