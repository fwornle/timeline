import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { updateTimelinePosition } from '../../store/intents/uiIntents';
import { useLogger } from '../../utils/logging/hooks/useLogger';

/**
 * Component that manages timeline drift animation
 * Moves the marker along the timeline when autoDrift is enabled
 */
export const TimelineDriftController: React.FC = () => {
  const dispatch = useAppDispatch();
  const logger = useLogger({ component: 'TimelineDriftController', topic: 'animation' });
  
  const { autoDrift, animationSpeed } = useAppSelector(state => state.ui);
  const { markerPosition } = useAppSelector(state => state.timeline);

  // Animation frame tracking
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  const lastStateUpdateRef = useRef<number>(0);

  // Use refs to access current state values to avoid dependencies
  const autoDriftRef = useRef(autoDrift);
  const animationSpeedRef = useRef(animationSpeed);
  const markerPositionRef = useRef(markerPosition);

  // Update refs when state changes
  useEffect(() => {
    autoDriftRef.current = autoDrift;
    animationSpeedRef.current = animationSpeed;
    markerPositionRef.current = markerPosition;
  }, [autoDrift, animationSpeed, markerPosition]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      // Check if animation should continue
      if (!autoDriftRef.current) {
        animationFrameRef.current = undefined;
        return;
      }

      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame(animate);

      const time = performance.now();

      // Calculate delta time for smooth movement
      // Prevent huge deltaTime jumps (e.g., when tab was inactive)
      const rawDeltaTime = (time - lastTimeRef.current) / 1000;
      const deltaTime = Math.min(rawDeltaTime, 0.1); // Cap at 100ms to prevent huge jumps
      lastTimeRef.current = time;

      const currentSpeed = animationSpeedRef.current;
      const currentPosition = markerPositionRef.current;

      if (currentSpeed !== 0) {
        // Apply scroll movement - always move forward (positive Z direction)
        const scrollDelta = Math.abs(currentSpeed) * deltaTime * 5; // Scale factor for movement speed

        if (scrollDelta > 0) {
          // Reduce state update frequency to prevent excessive re-renders
          const stateUpdateInterval = 50; // Update Redux state every 50ms (~20fps) instead of 60fps

          if (time - lastStateUpdateRef.current >= stateUpdateInterval) {
            const newPosition = currentPosition + scrollDelta;
            
            // Dispatch position update
            dispatch(updateTimelinePosition({ 
              position: newPosition, 
              updateCamera: true 
            }));
            
            lastStateUpdateRef.current = time;
          }
        }
      }
    };

    if (autoDrift) {
      // When starting animation, reset time references to prevent deltaTime issues
      const now = performance.now();
      lastTimeRef.current = now;
      lastStateUpdateRef.current = now;

      // Start animation
      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }

      logger.debug('Drift animation started', { 
        autoDrift, 
        animationSpeed, 
        markerPosition 
      });
    } else {
      // Stop animation loop when auto-drift is disabled
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }

      logger.debug('Drift animation stopped');
    }

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
  }, [autoDrift, dispatch, logger]);

  // This component doesn't render anything, it just manages animation
  return null;
};