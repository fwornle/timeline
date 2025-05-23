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

  // Use refs for animation loop to avoid dependency issues
  const stateRef = useRef(state);
  stateRef.current = state;

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

  // Handle card hover - ensure only one card can be hovered at a time
  const setHoveredCard = useCallback((id: string | null) => {
    setState(prev => {
      // Only update if the hover state actually changed
      if (prev.hoveredCardId === id) {
        return prev;
      }

      // Always clear existing hover when setting a new one to ensure exclusivity
      return { ...prev, hoveredCardId: id };
    });
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

  // Animation loop with performance optimizations
  const animate = useCallback((time: number) => {
    // Limit frame rate to 60fps for better performance
    const targetFrameTime = 1000 / 60; // 16.67ms per frame
    const deltaTime = (time - lastTimeRef.current) / 1000;

    // Skip frame if we're running too fast
    if (time - lastTimeRef.current < targetFrameTime) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    lastTimeRef.current = time;

    // Use refs to access current state values to avoid dependencies
    const currentState = stateRef.current;
    const isAutoScrolling = currentState.isAutoScrolling;
    const scrollSpeed = currentState.scrollSpeed;

    if (isAutoScrolling && scrollSpeed !== 0) {
      // Apply scroll movement - always move forward (positive Z direction)
      // This ensures we're always looking at the front of the cards
      const scrollDelta = Math.abs(scrollSpeed) * deltaTime;

      // Only update state if there's a meaningful change (reduce unnecessary re-renders)
      if (scrollDelta > 0.001) {
        setState(prev => ({
          ...prev,
          cameraTarget: prev.cameraTarget.clone().add(new THREE.Vector3(0, 0, scrollDelta)),
        }));
      }
    }

    // Only continue animation loop if auto-scrolling is active
    if (isAutoScrolling) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, []); // Remove dependencies to prevent recreation

  // Start/stop animation loop based on auto-scrolling state
  useEffect(() => {
    if (state.isAutoScrolling) {
      // Only start animation loop if auto-scrolling is enabled
      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    } else {
      // Stop animation loop when auto-scrolling is disabled
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
  }, [state.isAutoScrolling]); // Remove animate dependency

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
