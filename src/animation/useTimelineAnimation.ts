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
  const lastStateUpdateRef = useRef<number>(0);

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
    setState(prev => {
      const newIsAutoScrolling = !prev.isAutoScrolling;

      // If stopping auto-scroll, immediately cancel any pending animation frame
      // and freeze the current position to prevent inertia
      if (!newIsAutoScrolling && animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;

        // Immediately freeze the current position to prevent any drift
        // The current position is already in prev.cameraTarget, so we don't need to change it
        // This ensures no inertia or position jumping when stopping
      }

      return { ...prev, isAutoScrolling: newIsAutoScrolling };
    });
  }, []);

  // Update scroll speed
  const setScrollSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, scrollSpeed: speed }));
  }, []);

  // Update camera target position (for marker dragging)
  const setCameraTarget = useCallback((position: THREE.Vector3) => {
    // Immediately cancel any pending animation frame when manually positioning
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }

    setState(prev => ({
      ...prev,
      cameraTarget: position.clone(),
      isAutoScrolling: false // Stop auto-scrolling when manually positioning
    }));
  }, []);

  // Update camera target Z position only (for marker dragging)
  const setCameraTargetZ = useCallback((z: number) => {
    // Immediately cancel any pending animation frame when manually positioning
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }

    setState(prev => ({
      ...prev,
      cameraTarget: new THREE.Vector3(prev.cameraTarget.x, prev.cameraTarget.y, z),
      isAutoScrolling: false // Stop auto-scrolling when manually positioning
    }));
    // Reset the last time to prevent animation from immediately overriding this change
    lastTimeRef.current = performance.now();
  }, []);

  // Animation loop with smooth movement
  const animateRef = useRef<(() => void) | null>(null);

  const startAnimation = useCallback(() => {
    if (!animateRef.current) {
      animateRef.current = () => {
        // Schedule next frame immediately to ensure smooth animation
        if (animateRef.current) {
          animationFrameRef.current = requestAnimationFrame(animateRef.current);
        }
        
        const time = performance.now();
        
        // Calculate delta time for smooth movement
        // Prevent huge deltaTime jumps (e.g., when tab was inactive)
        const rawDeltaTime = (time - lastTimeRef.current) / 1000;
        const deltaTime = Math.min(rawDeltaTime, 0.1); // Cap at 100ms to prevent huge jumps
        lastTimeRef.current = time;

        // Use refs to access current state values to avoid dependencies
        const currentState = stateRef.current;
        const isAutoScrolling = currentState.isAutoScrolling;
        const scrollSpeed = currentState.scrollSpeed;

        if (isAutoScrolling && scrollSpeed !== 0) {
          // Apply scroll movement - always move forward (positive Z direction)
          // This ensures we're always looking at the front of the cards
          const scrollDelta = Math.abs(scrollSpeed) * deltaTime;

          // Update state directly for smooth movement
          if (scrollDelta > 0) {
            // Reduce state update frequency to prevent excessive re-renders
            const stateUpdateInterval = 50; // Update React state every 50ms (~20fps) instead of 60fps

            if (time - lastStateUpdateRef.current >= stateUpdateInterval) {
              // Use functional update to avoid stale closure issues
              setState(prev => {
                // Create a new Vector3 to ensure React detects the change
                const newTarget = new THREE.Vector3(
                  prev.cameraTarget.x,
                  prev.cameraTarget.y,
                  prev.cameraTarget.z + scrollDelta
                );
                return {
                  ...prev,
                  cameraTarget: newTarget,
                };
              });
              lastStateUpdateRef.current = time;
            }
          }
        }
      };
    }

    if (animateRef.current && !animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(animateRef.current);
    }
  }, []);

  // Start/stop animation loop based on auto-scrolling state
  useEffect(() => {
    if (state.isAutoScrolling) {
      // When starting animation, reset time references to prevent deltaTime issues
      const now = performance.now();
      lastTimeRef.current = now;
      lastStateUpdateRef.current = now;

      // Start animation
      startAnimation();
    } else {
      // Stop animation loop when auto-scrolling is disabled
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    }

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
  }, [state.isAutoScrolling, startAnimation]);

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
