import { useMemo, useRef, useEffect } from 'react';
import { Vector3, Camera } from 'three';
import { TimelineEvent } from '../data/types/TimelineEvent';
import { useLogger } from '../utils/logging/hooks/useLogger';
import { calculateEventZPositionWithIndex } from '../utils/timeline/timelineCalculations';
import { useAppDispatch } from '../store';
import { setThinnedEvents } from '../store/slices/timelineSlice';
import { setIsViewportThinning } from '../store/slices/uiSlice';

interface ViewportFilteringConfig {
  paddingFactor?: number;
  minEvents?: number;
  maxEvents?: number;
  updateThrottleMs?: number;
  debugMode?: boolean;
  windowSize?: number; // Size of the viewport window in world units
}

export const useViewportFiltering = (
  events: TimelineEvent[],
  camera: Camera,
  cameraTarget: Vector3,
  currentPosition: number,
  config: ViewportFilteringConfig = {}
) => {
  const {
    paddingFactor = 1.0,
    minEvents: _minEvents = 0, // eslint-disable-line @typescript-eslint/no-unused-vars
    maxEvents = 500,
    updateThrottleMs = 100,
    debugMode = false,
    windowSize = 110
  } = config;

  const logger = useLogger({ component: 'useViewportFiltering', topic: 'performance' });
  const dispatch = useAppDispatch();
  const lastUpdateRef = useRef<number>(0);
  const lastResultRef = useRef<TimelineEvent[]>([]);
  const lastThinningStateRef = useRef<{ isThinning: boolean; thinnedEvents: TimelineEvent[] }>({
    isThinning: false,
    thinnedEvents: []
  });

  // Get event Z position using centralized calculation - ALWAYS use full event set for consistency
  const getEventZPosition = (event: TimelineEvent, allSortedEvents: TimelineEvent[]): number => {
    if (allSortedEvents.length === 0) return 0;

    const minTime = allSortedEvents[0].timestamp.getTime();
    const maxTime = allSortedEvents[allSortedEvents.length - 1].timestamp.getTime();
    const eventIndex = allSortedEvents.findIndex(e => e.id === event.id);
    
    // CRITICAL: Always use full event count for consistent positioning
    return calculateEventZPositionWithIndex(event, eventIndex, minTime, maxTime, allSortedEvents.length);
  };

  const filteredEvents = useMemo(() => {
    const now = performance.now();
    
    // Return empty if no events
    if (events.length === 0) return [];
    
    // Throttle calculations
    if (now - lastUpdateRef.current < updateThrottleMs && lastResultRef.current.length > 0) {
      return lastResultRef.current;
    }
    
    // Sort events by timestamp - this is the MASTER list for position calculations
    const allSortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Calculate positions for ALL events using the full sorted list (position invariance)
    const eventPositions = allSortedEvents.map(event => ({
      event,
      z: getEventZPosition(event, allSortedEvents)
    }));
    
    const minZ = Math.min(...eventPositions.map(ep => ep.z));
    const maxZ = Math.max(...eventPositions.map(ep => ep.z));
    
    // SIMPLE approach: Calculate visible range, then thin out intelligently if needed
    const distance = camera.position.distanceTo(cameraTarget);
    
    // Calculate a reasonable visible range based on camera distance
    // Be much more generous with the viewport to ensure we can show up to maxEvents
    const baseViewRadius = Math.max(50, distance * 1.5); // Increased minimum and scaling factor
    const maxViewRadius = windowSize * 3 || 500; // Much larger maximum viewport size
    const viewRadius = Math.min(baseViewRadius * paddingFactor, maxViewRadius);
    
    // Center the viewport around the current timeline position (not camera position)
    // This ensures the viewport follows the timeline marker
    const centerZ = currentPosition;
    
    // Calculate viewport bounds (never go beyond timeline bounds)
    let visibleMinZ = Math.max(minZ, centerZ - viewRadius);
    let visibleMaxZ = Math.min(maxZ, centerZ + viewRadius);
    
    // Always log but let the logger's own configuration handle whether to output
    logger.debug('Simple viewport calculation', {
      distance: distance.toFixed(1),
      viewRadius: viewRadius.toFixed(1),
      center: centerZ.toFixed(1),
      bounds: `[${visibleMinZ.toFixed(1)}, ${visibleMaxZ.toFixed(1)}]`,
      timelineRange: `[${minZ.toFixed(1)}, ${maxZ.toFixed(1)}]`,
      currentPosition: currentPosition.toFixed(1),
      cameraZ: camera.position.z.toFixed(1),
      targetZ: cameraTarget.z.toFixed(1),
      totalEvents: events.length,
      eventPositionsCount: eventPositions.length
    });
    
    // Filter events within the true visible viewport
    let filtered = eventPositions
      .filter(ep => ep.z >= visibleMinZ && ep.z <= visibleMaxZ)
      .map(ep => ep.event);
      
    logger.debug('Initial viewport filtering result', {
      originalCount: eventPositions.length,
      filteredCount: filtered.length,
      samplePositions: eventPositions.slice(0, 5).map(ep => ({ id: ep.event.id.slice(0, 8), z: ep.z.toFixed(1) }))
    });
    
    // If we don't have enough events to utilize maxEvents, expand the viewport
    if (filtered.length < maxEvents && filtered.length < eventPositions.length) {
      // Calculate how much we need to expand to get closer to maxEvents
      const currentRange = visibleMaxZ - visibleMinZ;
      const totalRange = maxZ - minZ;
      const expansionFactor = Math.min(3.0, (maxEvents / Math.max(filtered.length, 1)));
      
      // Expand viewport symmetrically
      const expandedRadius = Math.min(currentRange * expansionFactor, totalRange / 2);
      const expandedMinZ = Math.max(minZ, centerZ - expandedRadius);
      const expandedMaxZ = Math.min(maxZ, centerZ + expandedRadius);
      
      // Get events in expanded viewport
      const expandedFiltered = eventPositions
        .filter(ep => ep.z >= expandedMinZ && ep.z <= expandedMaxZ)
        .map(ep => ep.event);
      
      if (expandedFiltered.length > filtered.length) {
        filtered = expandedFiltered;
        visibleMinZ = expandedMinZ;
        visibleMaxZ = expandedMaxZ;
        
        logger.debug('Expanded viewport to get more events', {
          originalCount: filtered.length,
          expandedCount: expandedFiltered.length,
          expansionFactor: expansionFactor.toFixed(2),
          newBounds: `[${expandedMinZ.toFixed(1)}, ${expandedMaxZ.toFixed(1)}]`
        });
      }
    }
    
    // Apply intelligent thinning if we have too many events
    const eventsInViewport = eventPositions.filter(ep => ep.z >= visibleMinZ && ep.z <= visibleMaxZ);
    const numThinning = eventsInViewport.length - maxEvents;
    
    if (numThinning > 0) {
      logger.debug('Thinning triggered', {
        totalInViewport: eventsInViewport.length,
        maxEvents,
        numThinning
      });
      
      // Sort events by Z position (oldest to newest)
      const sortedByZ = eventsInViewport.sort((a, b) => a.z - b.z);
      
      // Find the "now" marker position in the sorted events
      const nowZ = currentPosition;
      const nowIndex = sortedByZ.findIndex(ep => ep.z >= nowZ);
      const actualNowIndex = nowIndex === -1 ? sortedByZ.length : nowIndex;
      
      // Calculate the 40% window around "now" (120 events for maxEvents=300)
      const windowSize = Math.floor(0.4 * maxEvents); // 120 cards
      const idealBeforeNow = Math.floor(0.2 * maxEvents); // 60 cards
      const idealAfterNow = windowSize - idealBeforeNow; // 60 cards
      
      // Calculate actual before count
      const cardsBeforeNow = actualNowIndex;
      
      let windowStart, windowEnd;
      
      if (cardsBeforeNow >= idealBeforeNow) {
        // Enough cards before "now", use ideal window
        windowStart = actualNowIndex - idealBeforeNow;
        windowEnd = Math.min(sortedByZ.length, actualNowIndex + idealAfterNow);
      } else {
        // Not enough cards before "now", shift window towards future
        windowStart = Math.max(0, actualNowIndex - cardsBeforeNow);
        const remainingWindowSize = windowSize - cardsBeforeNow;
        windowEnd = Math.min(sortedByZ.length, actualNowIndex + remainingWindowSize);
      }
      
      // Reserve the 40% window around "now"
      const reservedEvents = sortedByZ.slice(windowStart, windowEnd);
      
      // Remaining events to choose from (60% of maxEvents = 180 for maxEvents=300)
      const remainingQuota = maxEvents - reservedEvents.length;
      
      // Split remaining events into before and after window
      const beforeWindow = sortedByZ.slice(0, windowStart);
      const afterWindow = sortedByZ.slice(windowEnd);
      
      // Prioritize future events (after window) first
      let selectedBeforeWindow: typeof beforeWindow = [];
      let selectedAfterWindow: typeof afterWindow = [];
      
      if (remainingQuota > 0) {
        // First, take as many future events as possible
        const futureQuota = Math.min(remainingQuota, afterWindow.length);
        selectedAfterWindow = afterWindow.slice(0, futureQuota);
        
        // Then fill remaining quota with past events (newest first from before window)
        const pastQuota = remainingQuota - selectedAfterWindow.length;
        if (pastQuota > 0 && beforeWindow.length > 0) {
          // Take newest events from before window (reverse order, closest to window first)
          selectedBeforeWindow = beforeWindow.slice(-pastQuota);
        }
      }
      
      // If we still have too many events, apply "every other card" thinning
      let finalEvents = [...selectedBeforeWindow, ...reservedEvents, ...selectedAfterWindow];
      
      if (finalEvents.length > maxEvents) {
        const excessCount = finalEvents.length - maxEvents;
        logger.debug('Applying every-other-card thinning', {
          beforeExcess: finalEvents.length,
          excessCount,
          targetCount: maxEvents
        });
        
        // Apply thinning starting from oldest in before window, then newest in after window
        const toRemove = new Set<string>();
        let removedCount = 0;
        
        // Remove every other card from before window (oldest first)
        for (let i = 0; i < selectedBeforeWindow.length && removedCount < excessCount; i += 2) {
          toRemove.add(selectedBeforeWindow[i].event.id);
          removedCount++;
        }
        
        // If still need to remove more, remove from after window (newest first)
        for (let i = selectedAfterWindow.length - 1; i >= 0 && removedCount < excessCount; i -= 2) {
          toRemove.add(selectedAfterWindow[i].event.id);
          removedCount++;
        }
        
        finalEvents = finalEvents.filter(ep => !toRemove.has(ep.event.id));
      }
      
      filtered = finalEvents.map(ep => ep.event);
      
      // Sort back to timeline order for rendering
      filtered = filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      logger.debug('Smart thinning applied', {
        originalCount: eventsInViewport.length,
        finalCount: filtered.length,
        windowSize,
        windowStart,
        windowEnd,
        reservedCount: reservedEvents.length,
        beforeWindowSelected: selectedBeforeWindow.length,
        afterWindowSelected: selectedAfterWindow.length,
        strategy: 'Smart importance-based with now-marker awareness'
      });
    } else {
      logger.debug('No thinning needed', {
        visibleEvents: eventsInViewport.length,
        maxEvents,
        underBy: maxEvents - eventsInViewport.length
      });
      
      filtered = eventsInViewport.map(ep => ep.event);
    }
    
    // Calculate thinning state (but don't dispatch here - we'll do it in useEffect)
    // Thinning is active if we had to reduce events due to maxEvents limit
    const originalViewportEvents = eventPositions.filter(ep => ep.z >= visibleMinZ && ep.z <= visibleMaxZ);
    const isThinning = originalViewportEvents.length > maxEvents;
    
    // Calculate thinned-out events (events that were in viewport but got filtered out)
    const thinnedEventsArray = isThinning 
      ? originalViewportEvents
          .map(ep => ep.event)
          .filter(event => !filtered.find(fe => fe.id === event.id))
      : [];
    
    // Store thinning state in ref for useEffect to dispatch
    lastThinningStateRef.current = { isThinning, thinnedEvents: thinnedEventsArray };
    
    // Update cache
    lastUpdateRef.current = now;
    lastResultRef.current = filtered;
    
    // Final debug before return
    logger.debug('Final viewport filtering result', {
      finalCount: filtered.length,
      sampleEvents: filtered.slice(0, 3).map(e => ({ id: e.id.slice(0, 8), timestamp: e.timestamp.toISOString().slice(0, 10) })),
      visibleBounds: `[${visibleMinZ.toFixed(1)}, ${visibleMaxZ.toFixed(1)}]`
    });
    
    // Log performance metrics with detailed event positions
    if (events.length > 0) {
      const reduction = ((events.length - filtered.length) / events.length * 100);
      
      // Get Z positions of first few events to debug
      const firstEventZ = eventPositions.length > 0 ? eventPositions[0].z : 'N/A';
      const lastEventZ = eventPositions.length > 0 ? eventPositions[eventPositions.length - 1].z : 'N/A';
      
      // Find events actually in viewport
      const eventsInViewport = eventPositions.filter(ep => 
        ep.z >= visibleMinZ && ep.z <= visibleMaxZ
      );
      
      const cameraDistance = camera.position.distanceTo(cameraTarget);
      const visibleRange = visibleMaxZ - visibleMinZ;
      const eventDensity = eventsInViewport.length / visibleRange;
      
      const thinningMethod = eventsInViewport.length <= maxEvents ? 'none' : 'balanced-biased-recent';

      const debugInfo = {
        totalEvents: events.length,
        visibleEvents: filtered.length,
        actualInViewport: eventsInViewport.length,
        reduction: `${reduction.toFixed(1)}%`,
        viewportBounds: `[${visibleMinZ.toFixed(1)}, ${visibleMaxZ.toFixed(1)}]`,
        viewportSize: visibleRange.toFixed(1),
        eventDensity: eventDensity.toFixed(2),
        thinningMethod,
        currentPosition: currentPosition.toFixed(1),
        eventZRange: `[${minZ.toFixed(1)}, ${maxZ.toFixed(1)}]`,
        viewCenter: ((camera.position.z + cameraTarget.z) / 2).toFixed(1),
        cameraDistance: cameraDistance.toFixed(1),
        cameraPosition: `(${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`,
        cameraTarget: `(${cameraTarget.x.toFixed(1)}, ${cameraTarget.y.toFixed(1)}, ${cameraTarget.z.toFixed(1)})`,
        sampleEventZ: {
          first: firstEventZ,
          last: lastEventZ
        }
      };
      
      logger.debug('Simple viewport filtering:', debugInfo);
    }
    
    return filtered;
  }, [events, camera, cameraTarget, currentPosition, paddingFactor, maxEvents, updateThrottleMs, debugMode, windowSize, logger]);

  // Use effect to dispatch Redux actions outside of render with throttling
  useEffect(() => {
    // Throttle Redux dispatches to reduce re-renders during rapid changes
    const timeoutId = setTimeout(() => {
      const { isThinning, thinnedEvents } = lastThinningStateRef.current;
      dispatch(setIsViewportThinning(isThinning));
      dispatch(setThinnedEvents(thinnedEvents));
    }, 50); // 50ms throttle to batch rapid changes

    return () => clearTimeout(timeoutId);
  }, [dispatch, lastThinningStateRef.current.isThinning, lastThinningStateRef.current.thinnedEvents.length]);

  return filteredEvents;
};