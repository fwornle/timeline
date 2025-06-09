import { useMemo, useRef } from 'react';
import { Vector3, Camera } from 'three';
import { TimelineEvent } from '../data/types/TimelineEvent';
import { useLogger } from '../utils/logging/hooks/useLogger';
import { calculateEventZPositionWithIndex } from '../utils/timeline/timelineCalculations';

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
  const lastUpdateRef = useRef<number>(0);
  const lastResultRef = useRef<TimelineEvent[]>([]);

  // Get event Z position using centralized calculation - ALWAYS use full event set for consistency
  const getEventZPosition = (event: TimelineEvent, allSortedEvents: TimelineEvent[]): number => {
    if (allSortedEvents.length === 0) return 0;

    const minTime = allSortedEvents[0].timestamp.getTime();
    const maxTime = allSortedEvents[allSortedEvents.length - 1].timestamp.getTime();
    const eventIndex = allSortedEvents.findIndex(e => e.id === event.id);
    
    // CRITICAL: Always use full event count for consistent positioning
    return calculateEventZPositionWithIndex(event, eventIndex, minTime, maxTime, allSortedEvents.length);
  };

  return useMemo(() => {
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
    
    if (debugMode) {
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
    }
    
    // Filter events within the true visible viewport
    let filtered = eventPositions
      .filter(ep => ep.z >= visibleMinZ && ep.z <= visibleMaxZ)
      .map(ep => ep.event);
      
    if (debugMode) {
      logger.debug('Initial viewport filtering result', {
        originalCount: eventPositions.length,
        filteredCount: filtered.length,
        samplePositions: eventPositions.slice(0, 5).map(ep => ({ id: ep.event.id.slice(0, 8), z: ep.z.toFixed(1) }))
      });
    }
    
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
        
        if (debugMode) {
          logger.debug('Expanded viewport to get more events', {
            originalCount: filtered.length,
            expandedCount: expandedFiltered.length,
            expansionFactor: expansionFactor.toFixed(2),
            newBounds: `[${expandedMinZ.toFixed(1)}, ${expandedMaxZ.toFixed(1)}]`
          });
        }
      }
    }
    
    // ONLY thin if we actually have too many events
    if (filtered.length > maxEvents) {
      if (debugMode) {
        logger.debug('Thinning triggered', {
          visibleEvents: filtered.length,
          maxEvents,
          exceedsBy: filtered.length - maxEvents
        });
      }
      
      // Simple approach: Sort events by Z position and prioritize keeping recent (future) events
      const sortedByZ = eventPositions
        .filter(ep => ep.z >= visibleMinZ && ep.z <= visibleMaxZ)
        .sort((a, b) => b.z - a.z); // Sort by Z position descending (future first)
      
      // Keep the most recent maxEvents, removing from the past first
      const eventsToKeep = sortedByZ.slice(0, maxEvents);
      filtered = eventsToKeep.map(ep => ep.event);

      // Sort back to timeline order for rendering
      filtered = filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      if (debugMode) {
        logger.debug('Simple future-biased thinning applied', {
          totalInViewport: sortedByZ.length,
          finalCount: filtered.length,
          removedCount: sortedByZ.length - filtered.length,
          strategy: 'Keep most recent events, remove from past first'
        });
      }
    } else {
      if (debugMode) {
        logger.debug('No thinning needed', {
          visibleEvents: filtered.length,
          maxEvents,
          underBy: maxEvents - filtered.length
        });
      }
    }
    
    // Store thinning status and thinned events in sessionStorage for UI indicator
    // Thinning is active if we had to reduce events due to maxEvents limit
    const originalViewportEvents = eventPositions.filter(ep => ep.z >= visibleMinZ && ep.z <= visibleMaxZ);
    const isThinning = originalViewportEvents.length > maxEvents;
    sessionStorage.setItem('isViewportThinning', isThinning.toString());
    
    // Calculate thinned-out events (events that were in viewport but got filtered out)
    const thinnedEvents = isThinning 
      ? originalViewportEvents
          .map(ep => ep.event)
          .filter(event => !filtered.find(fe => fe.id === event.id))
      : [];
    
    // Store thinned events for ViewportFilteredEvents to access
    sessionStorage.setItem('thinnedEvents', JSON.stringify(thinnedEvents.map(e => e.id)));
    
    // Update cache
    lastUpdateRef.current = now;
    lastResultRef.current = filtered;
    
    // Final debug before return
    if (debugMode) {
      logger.debug('Final viewport filtering result', {
        finalCount: filtered.length,
        sampleEvents: filtered.slice(0, 3).map(e => ({ id: e.id.slice(0, 8), timestamp: e.timestamp.toISOString().slice(0, 10) })),
        visibleBounds: `[${visibleMinZ.toFixed(1)}, ${visibleMaxZ.toFixed(1)}]`
      });
    }
    
    // Log performance metrics with detailed event positions
    if (debugMode && events.length > 0) {
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
};