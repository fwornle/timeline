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
}

export function useTimelineAnimation(config: TimelineAnimationConfig = {}) {
  const {
    enableAutoScroll = false,
    initialScrollSpeed = DEFAULTS.SCROLL.SPEED,
    springConfig = SPRING_CONFIG.GENTLE,
  } = config;

  // Animation state
  const [state, setState] = useState<TimelineAnimationState>({
    isAutoScrolling: enableAutoScroll,
    scrollSpeed: initialScrollSpeed,
    selectedCardId: null,
    hoveredCardId: null,
    cameraTarget: new THREE.Vector3(0, 0, 0),
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

    const scale = isSelected 
      ? DEFAULTS.CARD.SCALE.SELECTED
      : isHovered 
        ? DEFAULTS.CARD.SCALE.HOVER 
        : DEFAULTS.CARD.SCALE.DEFAULT;

    const rotation = isSelected 
      ? DEFAULTS.CARD.ROTATION.SELECTED
      : isHovered 
        ? DEFAULTS.CARD.ROTATION.HOVER
        : DEFAULTS.CARD.ROTATION.DEFAULT;

    const positionY = isSelected 
      ? DEFAULTS.CARD.POSITION_Y.SELECTED
      : isHovered 
        ? DEFAULTS.CARD.POSITION_Y.HOVER
        : DEFAULTS.CARD.POSITION_Y.DEFAULT;

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

  // Handle card hover
  const setHoveredCard = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, hoveredCardId: id }));
  }, []);

  // Toggle auto-scrolling
  const toggleAutoScroll = useCallback(() => {
    setState(prev => ({ ...prev, isAutoScrolling: !prev.isAutoScrolling }));
  }, []);

  // Update scroll speed
  const setScrollSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, scrollSpeed: speed }));
  }, []);

  // Animation loop
  const animate = useCallback((time: number) => {
    const deltaTime = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    if (state.isAutoScrolling) {
      // Apply scroll movement
      const scrollDelta = state.scrollSpeed * deltaTime;
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
    getCardAnimationProps,
    updateCardPosition,
    selectCard,
    setHoveredCard,
    toggleAutoScroll,
    setScrollSpeed,
  };
}