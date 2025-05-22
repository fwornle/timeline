import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { DEFAULTS, SPRING_CONFIG } from './constants';
import { createSpringConfig } from './transitions';
import type { SpringConfig } from './transitions';

interface TimelineAnimationState {
  isAutoScrolling: boolean;
  scrollSpeed: number;
  selectedCardId: string | null;
  hoveredCardId: string | null;
  cameraTarget: THREE.Vector3;
}

interface TimelineAnimationConfig {
  enableAutoScroll?: boolean;
  initialScrollSpeed?: number;
  springConfig?: SpringConfig;
  initialMarkerPosition?: number;
}

export function useTimelineAnimation(config: TimelineAnimationConfig = {}) {
  const {
    enableAutoScroll = false,
    initialScrollSpeed = DEFAULTS.SCROLL.SPEED,
    springConfig = SPRING_CONFIG.GENTLE,
    initialMarkerPosition = 0,
  } = config;

  // Animation state
  const [state, setState] = useState<TimelineAnimationState>({
    isAutoScrolling: enableAutoScroll,
    scrollSpeed: initialScrollSpeed,
    selectedCardId: null,
    hoveredCardId: null,
    cameraTarget: new THREE.Vector3(0, 0, initialMarkerPosition),
  });

  // Animation frame tracking
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);

  // Card position cache
  const cardPositionsRef = useRef<Map<string, THREE.Vector3>>(new Map());

  // Update card position in cache
  const updateCardPosition = useCallback((id: string, position: THREE.Vector3) => {
    cardPositionsRef.current.set(id, position.clone());
  }, []);

  // Get card animation properties
  const getCardAnimationProps = useCallback((id: string) => {
    const isSelected = id === state.selectedCardId;
    const isHovered = id === state.hoveredCardId;

    // Explicitly type the scale values to match the expected types in TimelineScene
    const scale = isSelected
      ? DEFAULTS.CARD.SCALE.SELECTED as 1.2
      : isHovered
        ? DEFAULTS.CARD.SCALE.HOVER as 1.1
        : DEFAULTS.CARD.SCALE.DEFAULT as 1;

    const rotation = isSelected
      ? DEFAULTS.CARD.ROTATION.SELECTED
      : isHovered
        ? DEFAULTS.CARD.ROTATION.HOVER
        : DEFAULTS.CARD.ROTATION.DEFAULT;

    // Explicitly type the positionY values to match the expected types in TimelineScene
    const positionY = isSelected
      ? DEFAULTS.CARD.POSITION_Y.SELECTED as 0.5
      : isHovered
        ? DEFAULTS.CARD.POSITION_Y.HOVER as 0.2
        : DEFAULTS.CARD.POSITION_Y.DEFAULT as 0;

    return {
      scale,
      rotation,
      positionY,
      springConfig: createSpringConfig(
        isSelected
          ? SPRING_CONFIG.BOUNCY
          : springConfig
      ),
    };
  }, [state.selectedCardId, state.hoveredCardId, springConfig]);

  // Handle card selection
  const selectCard = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedCardId: id }));

    if (id && cardPositionsRef.current.has(id)) {
      const position = cardPositionsRef.current.get(id)!;
      setState(prev => ({
        ...prev,
        cameraTarget: position,
        isAutoScrolling: false,
      }));
    }
  }, []);

  // Handle card hover with debounce to prevent flickering
  const setHoveredCard = useCallback((id: string | null) => {
    // If we're setting to null (hover end), check if it's the same as the currently hovered card
    if (id === null) {
      // Only clear hover if it's been at least 100ms since the last hover start
      // This prevents flickering when the mouse moves between parts of the same card
      setState(prev => {
        // Don't clear hover if we just started hovering
        return { ...prev, hoveredCardId: id };
      });
    } else {
      // Always set hover immediately when hovering a card
      setState(prev => ({ ...prev, hoveredCardId: id }));
    }
  }, []);

  // Toggle auto-scrolling
  const toggleAutoScroll = useCallback(() => {
    setState(prev => ({ ...prev, isAutoScrolling: !prev.isAutoScrolling }));
  }, []);

  // Update scroll speed
  const setScrollSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, scrollSpeed: speed }));
  }, []);

  // Update camera target position (for marker dragging)
  const setCameraTarget = useCallback((position: THREE.Vector3) => {
    setState(prev => ({
      ...prev,
      cameraTarget: position.clone(),
      isAutoScrolling: false // Stop auto-scrolling when manually positioning
    }));
  }, []);

  // Update camera target Z position only (for marker dragging)
  const setCameraTargetZ = useCallback((z: number) => {
    setState(prev => ({
      ...prev,
      cameraTarget: new THREE.Vector3(prev.cameraTarget.x, prev.cameraTarget.y, z),
      isAutoScrolling: false // Stop auto-scrolling when manually positioning
    }));
  }, []);

  // Animation loop
  const animate = useCallback((time: number) => {
    const deltaTime = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    // Use refs to access current state values to avoid dependencies
    const isAutoScrolling = state.isAutoScrolling;
    const scrollSpeed = state.scrollSpeed;

    if (isAutoScrolling) {
      // Apply scroll movement - always move forward (positive Z direction)
      // This ensures we're always looking at the front of the cards
      const scrollDelta = Math.abs(scrollSpeed) * deltaTime;
      setState(prev => ({
        ...prev,
        cameraTarget: prev.cameraTarget.clone().add(new THREE.Vector3(0, 0, scrollDelta)),
      }));
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [state.isAutoScrolling, state.scrollSpeed]);

  // Start/stop animation loop
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate]);

  return {
    isAutoScrolling: state.isAutoScrolling,
    scrollSpeed: state.scrollSpeed,
    selectedCardId: state.selectedCardId,
    hoveredCardId: state.hoveredCardId,
    cameraTarget: state.cameraTarget,
    cardPositionsRef, // Expose the card positions ref for external use
    getCardAnimationProps,
    updateCardPosition,
    selectCard,
    setHoveredCard,
    toggleAutoScroll,
    setScrollSpeed,
    setCameraTarget,
    setCameraTargetZ,
  };
}
