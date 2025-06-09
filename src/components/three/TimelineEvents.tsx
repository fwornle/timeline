import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { TimelineCard } from './TimelineCard';
import { Vector3 } from 'three';
import { useThree } from '@react-three/fiber';
import type { TimelineEvent } from '../../data/types/TimelineEvent';
import { calculateEventZPositionWithIndex } from '../../utils/timeline/timelineCalculations';
import { dimensions } from '../../config';
import { useDebugLogger } from '../../utils/logging/useDebugLogger';
import { usePerformanceProfiler } from '../../utils/performance/usePerformanceProfiler';
import { useAppSelector, useAppDispatch } from '../../store';
import { hoverCard } from '../../store/intents/uiIntents';
import { setMarkerFadeOpacity, setDebugMarkerFade, setFadedCardsTemporalRange } from '../../store/slices/uiSlice';

interface TimelineEventsProps {
  events: TimelineEvent[]; // All events for position calculation
  visibleEvents?: TimelineEvent[]; // Filtered events for rendering (optional for backward compatibility)
  selectedCardId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onPositionUpdate: (id: string, position: Vector3) => void;
  getAnimationProps: (id: string) => {
    scale: 1 | 1.1 | 1.2;
    rotation: readonly [0, number, 0];
    positionY: 0 | 0.2 | 0.5;
    springConfig: {
      mass: number;
      tension: number;
      friction: number;
    };
  };
  currentPosition?: number;
  isMarkerDragging?: boolean;
  isTimelineHovering?: boolean;
  droneMode?: boolean;
  debugMode?: boolean;
}

export const TimelineEvents: React.FC<TimelineEventsProps> = ({
  events,
  visibleEvents,
  selectedCardId,
  onSelect,
  onHover,
  onPositionUpdate,
  getAnimationProps,
  currentPosition = 0,
  isMarkerDragging = false,
  isTimelineHovering = false,
  droneMode = false,
  debugMode = false
}) => {
  const logger = useDebugLogger('THREE', 'rendering');
  
  // Performance profiling
  const { trackExpensiveOperation } = usePerformanceProfiler({
    componentName: 'TimelineEvents',
    enabled: process.env.NODE_ENV === 'development',
    threshold: 10 // Higher threshold since this component handles many events
  });
  
  // Use visibleEvents for rendering if provided, otherwise render all events
  const eventsToRender = visibleEvents || events;
  
  // Debug logging to track filtering behavior
  if (debugMode && visibleEvents) {
    logger.debug(`Total events: ${events.length}, Rendering: ${eventsToRender.length}, Position: ${currentPosition.toFixed(1)}`);
  }
  // Use Redux for card hover state
  const dispatch = useAppDispatch();
  const hoveredCardId = useAppSelector(state => state.ui.hoveredCardId);
  
  
  // Debug state for bounding box visualization
  const [debugInfo, setDebugInfo] = useState<{
    hoveredBounds?: Record<string, unknown>;
    expandedBounds?: Record<string, unknown>;
    cardOverlaps?: Map<string, boolean>;
  }>({});
  
  // Get camera reference for occlusion detection
  const { camera } = useThree();
  
  // Debug mode is now passed as a prop

  // Store onPositionUpdate in ref to avoid dependency issues
  const onPositionUpdateRef = useRef(onPositionUpdate);
  onPositionUpdateRef.current = onPositionUpdate;

  // Handle hover with Redux
  const handleCardHover = useCallback((cardId: string | null) => {
    // Use Redux intent to update hover state
    dispatch(hoverCard(cardId));
    
    // Forward to parent for actual card interaction
    if (onHover) {
      onHover(cardId);
    }
  }, [dispatch, onHover]);

  // Memoize sorted events to avoid recalculating on every render
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [events]);

  // Memoize time range calculation
  const timeRange = useMemo(() => {
    if (sortedEvents.length === 0) return { minTime: 0, maxTime: 0 };
    return {
      minTime: sortedEvents[0].timestamp.getTime(),
      maxTime: sortedEvents[sortedEvents.length - 1].timestamp.getTime()
    };
  }, [sortedEvents]);

  // Calculate positions for events based on their timestamps (optimized)
  // Memoize the position calculation to prevent infinite loops
  const getEventPosition = useMemo(() => {
    // Create a stable function that doesn't change unless events or timeRange change
    return (event: TimelineEvent): [number, number, number] => {
      return trackExpensiveOperation('eventPositionCalculation', () => {
      // If no events, return default position
      if (events.length === 0) return [0, 2, 0];

      const { minTime, maxTime } = timeRange;

      // Calculate the time span
      const timeSpan = maxTime - minTime;

      // If all events have the same timestamp, spread them evenly around center
      if (timeSpan === 0) {
        const index = events.findIndex((e: TimelineEvent) => e.id === event.id);
        const spacing = 5;
        // Center events around z=0
        const zPos = (index - (events.length - 1) / 2) * spacing;

        // Alternate x positions for better visibility
        const xOffset = 3; // Reduced offset to save horizontal space
        const xPos = index % 2 === 0 ? -xOffset : xOffset;

        return [xPos, 2, zPos];
      }

      // Use centralized position calculation
      const eventIndex = sortedEvents.findIndex(e => e.id === event.id);
      const zPos = calculateEventZPositionWithIndex(event, eventIndex, minTime, maxTime, events.length);

      // Alternate x positions for better visibility based on sorted index
      const xOffset = 3; // Reduced offset to save horizontal space
      const xPos = eventIndex % 2 === 0 ? -xOffset : xOffset;

      // Y position is raised to move everything up
      const yPos = 2;

        return [xPos, yPos, zPos];
      });
    };
  }, [events, timeRange, sortedEvents, trackExpensiveOperation]);

  // Track previous 'now' position
  const prevNowRef = useRef(currentPosition);
  // Track which cards should wiggle
  const [wiggleMap, setWiggleMap] = useState<{ [id: string]: boolean }>({});

  // Update position cache when events change
  // Use a ref to track if we've already updated positions for this event set
  const lastEventsHashRef = useRef<string>('');

  useEffect(() => {
    // Create a hash of the events to detect actual changes
    const eventsHash = events.map(e => `${e.id}-${e.timestamp.getTime()}`).join('|');

    // Only update if events actually changed
    if (eventsHash !== lastEventsHashRef.current) {
      // Use requestAnimationFrame to defer the position updates until after render
      requestAnimationFrame(() => {
        events.forEach((event) => {
          const position = getEventPosition(event);
          onPositionUpdateRef.current(
            event.id,
            new Vector3(position[0], position[1], position[2])
          );
        });
      });
      lastEventsHashRef.current = eventsHash;
    }
  }, [events, getEventPosition]);

  // Track active wiggle timeouts to prevent memory leaks
  const wiggleTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    // Throttle wiggle checks to prevent excessive updates during animation
    const threshold = 1.0; // Increase threshold to reduce frequency
    const prevNow = prevNowRef.current;

    if (Math.abs(currentPosition - prevNow) < threshold) {
      return;
    }

    // Use requestAnimationFrame to defer the wiggle check and prevent blocking
    const checkWiggle = () => {
      // For each event, check if the now plane crossed its Z position
      events.forEach((event) => {
        const position = getEventPosition(event);
        const cardZ = position[2];

        // If the now plane crossed the card (from either direction)
        if ((prevNow < cardZ && currentPosition >= cardZ) || (prevNow > cardZ && currentPosition <= cardZ)) {
          // Clear any existing timeout for this card
          const existingTimeout = wiggleTimeoutsRef.current.get(event.id);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          // Start wiggle animation
          setWiggleMap((prev) => ({ ...prev, [event.id]: true }));

          // Set timeout to stop wiggle
          const timeout = setTimeout(() => {
            setWiggleMap((prev) => ({ ...prev, [event.id]: false }));
            wiggleTimeoutsRef.current.delete(event.id);
          }, 300); // Slightly longer duration for better visibility

          wiggleTimeoutsRef.current.set(event.id, timeout);
        }
      });
      prevNowRef.current = currentPosition;
    };

    // Defer the wiggle check to the next frame to prevent blocking
    requestAnimationFrame(checkWiggle);
  }, [currentPosition, events, getEventPosition]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      wiggleTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      wiggleTimeoutsRef.current.clear();
    };
  }, []);

  // Helper function to project 3D world position to 2D screen coordinates
  const worldToScreen = (worldPos: Vector3) => {
    const vector = worldPos.clone();
    vector.project(camera);
    
    // Convert from [-1, 1] to screen coordinates
    // Note: we don't need actual pixel coordinates, just normalized space for comparison
    return {
      x: vector.x,
      y: vector.y,
      z: vector.z // depth for visibility check
    };
  };

  // Helper function to calculate 2D bounding box of a card in screen space
  const getCardScreenBounds = (worldPos: Vector3, scale: number) => {
    const cardWidth = dimensions.card.width * scale;
    const cardHeight = dimensions.card.height * scale;
    
    // Calculate the 4 corners of the card in world space
    const corners = [
      new Vector3(worldPos.x - cardWidth/2, worldPos.y - cardHeight/2, worldPos.z),
      new Vector3(worldPos.x + cardWidth/2, worldPos.y - cardHeight/2, worldPos.z),
      new Vector3(worldPos.x + cardWidth/2, worldPos.y + cardHeight/2, worldPos.z),
      new Vector3(worldPos.x - cardWidth/2, worldPos.y + cardHeight/2, worldPos.z)
    ];
    
    // Project all corners to screen space
    const screenCorners = corners.map(worldToScreen);
    
    // Find bounding box in screen space
    const minX = Math.min(...screenCorners.map(c => c.x));
    const maxX = Math.max(...screenCorners.map(c => c.x));
    const minY = Math.min(...screenCorners.map(c => c.y));
    const maxY = Math.max(...screenCorners.map(c => c.y));
    
    return { minX, maxX, minY, maxY };
  };

  // Helper function to check if two 2D bounding boxes overlap
  const boundingBoxesOverlap = (box1: any, box2: any) => {
    return !(box1.maxX < box2.minX || box2.maxX < box1.minX || 
             box1.maxY < box2.minY || box2.maxY < box1.minY);
  };

  // Track last hover change time to debounce occlusion calculations
  const lastHoverChangeRef = useRef(0);
  const [debouncedHoveredCardId, setDebouncedHoveredCardId] = useState<string | null>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedHoveredCardId(hoveredCardId);
      lastHoverChangeRef.current = Date.now();
    }, 50); // 50ms debounce
    
    return () => clearTimeout(timer);
  }, [hoveredCardId]);
  
  // Calculate which cards should be faded due to occlusion
  const cardFadeStates = useMemo(() => {
    // Debug Redux state
    if (debugMode) {
      logger.debug(`cardFadeStates useMemo running with debouncedHoveredCardId: ${debouncedHoveredCardId ? debouncedHoveredCardId.slice(-6) : 'null'}`);
      logger.debug('Occlusion check (Redux):', {
        debouncedHoveredCardId,
        eventsToRenderCount: eventsToRender.length
      });
    }
    
    // Only fade cards when a card is hovered (using debounced Redux state)
    const openedCardId = debouncedHoveredCardId;
    
    if (!openedCardId) {
      // Clear debug info when no card is hovered or open
      logger.debug('No opened card - clearing all fade states', {
        hoveredCardId,
        openedCardId,
        timestamp: Date.now()
      });
      setDebugInfo({});
      return new Map<string, number>();
    }
    
    if (debugMode) {
      logger.debug(`Starting occlusion calculation for opened card: ${openedCardId}`);
    }
    
    const config = dimensions.animation.card.occlusion;
    if (!config.enableFrontCardFading) return new Map<string, number>();
    
    const fadeMap = new Map<string, number>();
    
    // Find the opened card position
    const openedEvent = eventsToRender.find(e => e.id === openedCardId);
    if (!openedEvent) return fadeMap;
    
    if (config.fadeStrategy === 'aggressive') {
      // AGGRESSIVE MODE: Fade ALL cards except the opened one, but preserve viewport-based fading
      eventsToRender.forEach(event => {
        if (event.id === openedCardId) {
          fadeMap.set(event.id, 1.0); // Opened card is fully visible
        } else {
          fadeMap.set(event.id, config.aggressiveFadeOpacity); // All others heavily faded
        }
      });
    } else if (config.fadeStrategy === 'boundingBox') {
      // BOUNDING BOX MODE: Fade cards that overlap with opened card's screen area
      const openedPosition = getEventPosition(openedEvent);
      const openedWorldPos = new Vector3(openedPosition[0], openedPosition[1], openedPosition[2]);
      
      // Get the current scale of the opened card (it might be zoomed)
      // We need to estimate this based on camera distance and the zoom logic
      const distanceToOpened = openedWorldPos.distanceTo(camera.position);
      const fovRadians = (camera as any).fov ? ((camera as any).fov * Math.PI) / 180 : (45 * Math.PI) / 180;
      const visibleHeight = 2 * Math.tan(fovRadians / 2) * distanceToOpened;
      const targetCardHeight = visibleHeight / 3;
      const openedScale = Math.min(Math.max(targetCardHeight / dimensions.card.height, 1.2), 8.0);
      
      // Calculate screen-space bounding box of the opened card
      const openedBounds = getCardScreenBounds(openedWorldPos, openedScale);
      
      // Add safety margin
      const margin = config.boundingBoxMargin;
      const marginX = (openedBounds.maxX - openedBounds.minX) * margin;
      const marginY = (openedBounds.maxY - openedBounds.minY) * margin;
      
      const expandedOpenedBounds = {
        minX: openedBounds.minX - marginX,
        maxX: openedBounds.maxX + marginX,
        minY: openedBounds.minY - marginY,
        maxY: openedBounds.maxY + marginY
      };
      
      // Store debug info
      const cardOverlaps = new Map<string, boolean>();
      
      
      // Check each card for screen-space overlap
      eventsToRender.forEach(event => {
        if (event.id === openedCardId) {
          fadeMap.set(event.id, 1.0); // Opened card is fully visible
          cardOverlaps.set(event.id, false);
          return;
        }
        
        const eventPosition = getEventPosition(event);
        const eventWorldPos = new Vector3(eventPosition[0], eventPosition[1], eventPosition[2]);
        
        // Project card center to screen space for basic visibility check
        const screenPos = worldToScreen(eventWorldPos);
        
        // Skip cards that are behind the camera or too far in front
        if (screenPos.z < -1 || screenPos.z > 1) {
          fadeMap.set(event.id, 1.0);
          cardOverlaps.set(event.id, false);
          return;
        }
        
        // Calculate bounding box for this card (assume default scale for non-hovered cards)
        const cardBounds = getCardScreenBounds(eventWorldPos, 1.0);
        
        // Check if this card's bounding box overlaps with the expanded opened card bounds
        const geometricOverlaps = boundingBoxesOverlap(cardBounds, expandedOpenedBounds);
        
        // Also check temporal proximity: include cards within +1 day towards the future
        const oneDayMs = 24 * 60 * 60 * 1000; // 1 day in milliseconds
        const timeDiff = event.timestamp.getTime() - openedEvent.timestamp.getTime();
        const isTemporallyNear = timeDiff >= 0 && timeDiff <= oneDayMs; // +1 day towards future
        
        // Card should be faded if it geometrically overlaps OR is temporally near (future-ward)
        const overlaps = geometricOverlaps || isTemporallyNear;
        
        
        cardOverlaps.set(event.id, overlaps);
        
        if (overlaps) {
          // Calculate fade intensity based on overlap amount and distance
          const overlapArea = Math.max(0, 
            Math.min(cardBounds.maxX, expandedOpenedBounds.maxX) - Math.max(cardBounds.minX, expandedOpenedBounds.minX)
          ) * Math.max(0,
            Math.min(cardBounds.maxY, expandedOpenedBounds.maxY) - Math.max(cardBounds.minY, expandedOpenedBounds.minY)
          );
          
          const cardArea = (cardBounds.maxX - cardBounds.minX) * (cardBounds.maxY - cardBounds.minY);
          const overlapRatio = cardArea > 0 ? overlapArea / cardArea : 0;
          
          // Fade more aggressively for higher overlap
          const fadeIntensity = config.boundingBoxFadeOpacity + 
            (0.5 - config.boundingBoxFadeOpacity) * (1 - overlapRatio);
          
          const finalOpacity = Math.max(config.boundingBoxFadeOpacity, fadeIntensity);
          fadeMap.set(event.id, finalOpacity);
          
          if (debugMode) {
            logger.debug(`Card ${event.id.slice(-6)} will fade: geometric=${geometricOverlaps} temporal=${isTemporallyNear} opacity=${finalOpacity.toFixed(3)}`);
          }
        } else {
          fadeMap.set(event.id, 1.0); // No overlap, keep fully visible
        }
      });
      
      // Update debug info for visualization - use Redux debug mode state
      if (debugMode) {
        setDebugInfo({
          hoveredBounds: openedBounds,
          expandedBounds: expandedOpenedBounds,
          cardOverlaps
        });
        
      }
    }
    
    // Debug the final fade map
    if (debugMode && fadeMap.size > 0) {
      const fadeEntries = Array.from(fadeMap.entries());
      logger.debug(`Final fade map (${fadeEntries.length} cards):`, { 
        cards: fadeEntries.map(([id, opacity]) => `${id.slice(-6)}: ${opacity.toFixed(3)}`)
      });
    }
    
    return fadeMap;
  }, [debouncedHoveredCardId, selectedCardId, eventsToRender, getEventPosition, camera, debugMode]);
  
  // Handle marker fade updates in a separate useEffect to avoid dispatch during render
  useEffect(() => {
    const config = dimensions.animation.card.occlusion;
    
    if (!debouncedHoveredCardId) {
      // Clear marker fade when no card is hovered
      dispatch(setMarkerFadeOpacity(1.0));
      dispatch(setDebugMarkerFade(false));
      dispatch(setFadedCardsTemporalRange(null));
      return;
    }
    
    if (cardFadeStates.size > 0) {
      // Find the temporal range of all faded cards
      const fadedCardTimestamps = Array.from(cardFadeStates.entries())
        .filter(([_, opacity]) => opacity < 1.0) // Only cards that are actually faded
        .map(([cardId, _]) => {
          const event = eventsToRender.find(e => e.id === cardId);
          return event ? event.timestamp.getTime() : null;
        })
        .filter(timestamp => timestamp !== null) as number[];
      
      if (fadedCardTimestamps.length > 0) {
        // Get the range from earliest to latest faded card
        const minTimestamp = Math.min(...fadedCardTimestamps);
        const maxTimestamp = Math.max(...fadedCardTimestamps);
        
        // Store the temporal range of faded cards for markers to check against
        const temporalRange = { minTimestamp, maxTimestamp };
        dispatch(setFadedCardsTemporalRange(temporalRange));
        
        // Set marker fade opacity (markers will individually apply this if they're in range)
        dispatch(setMarkerFadeOpacity(config.boundingBoxFadeOpacity));
        
        // Set debug marker state - markers in temporal range will show green in debug mode
        dispatch(setDebugMarkerFade(debugMode));
        
        if (debugMode) {
          logger.debug(`Marker fade calculation: fadedRange=${new Date(minTimestamp).toISOString()} to ${new Date(maxTimestamp).toISOString()}, fadedCards=${fadedCardTimestamps.length}, opacity=${config.boundingBoxFadeOpacity}`);
        }
      } else {
        // No cards are actually faded, ensure markers are fully visible
        dispatch(setMarkerFadeOpacity(1.0));
        dispatch(setDebugMarkerFade(false));
        dispatch(setFadedCardsTemporalRange(null));
      }
    } else {
      // No cards are faded, ensure markers are fully visible
      dispatch(setMarkerFadeOpacity(1.0));
      dispatch(setDebugMarkerFade(false));
      dispatch(setFadedCardsTemporalRange(null));
    }
  }, [cardFadeStates, debouncedHoveredCardId, eventsToRender, debugMode, dispatch]);


  // Memoize the cards to prevent unnecessary re-renders
  const renderedCards = useMemo(() => {
    return trackExpensiveOperation('renderTimelineCards', () => {
      return eventsToRender.map((event) => {
      const position = getEventPosition(event);
      const shouldShowDebugMarker = debugMode && 
        debugInfo.cardOverlaps?.get(event.id) === true;
      
      const fadeOpacity = cardFadeStates.get(event.id) ?? 1.0;

      return (
        <TimelineCard
          key={event.id}
          event={event}
          position={position}
          selected={event.id === selectedCardId}
          onSelect={onSelect}
          onHover={handleCardHover}
          animationProps={{
            ...getAnimationProps(event.id),
            rotation: getAnimationProps(event.id).rotation as [number, number, number]
          }}
          wiggle={!!wiggleMap[event.id]}
          isMarkerDragging={isMarkerDragging}
          droneMode={droneMode}
          isHovered={hoveredCardId === event.id}
          fadeOpacity={fadeOpacity}
          debugMarker={shouldShowDebugMarker}
        />
        );
      });
    });
  }, [eventsToRender, getEventPosition, selectedCardId, onSelect, handleCardHover, getAnimationProps, wiggleMap, isMarkerDragging, isTimelineHovering, droneMode, hoveredCardId, cardFadeStates, debugInfo, debugMode, trackExpensiveOperation]);

  return (
    <group>
      {renderedCards}
    </group>
  );
};
