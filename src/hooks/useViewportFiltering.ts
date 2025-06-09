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

  // Get event Z position using centralized calculation
  const getEventZPosition = (event: TimelineEvent, sortedEvents: TimelineEvent[]): number => {
    if (sortedEvents.length === 0) return 0;

    const minTime = sortedEvents[0].timestamp.getTime();
    const maxTime = sortedEvents[sortedEvents.length - 1].timestamp.getTime();
    const eventIndex = sortedEvents.findIndex(e => e.id === event.id);
    
    return calculateEventZPositionWithIndex(event, eventIndex, minTime, maxTime, sortedEvents.length);
  };

  return useMemo(() => {
    const now = performance.now();
    
    // Return empty if no events
    if (events.length === 0) return [];
    
    // Throttle calculations
    if (now - lastUpdateRef.current < updateThrottleMs && lastResultRef.current.length > 0) {
      return lastResultRef.current;
    }
    
    // Sort events by timestamp
    const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Calculate timeline bounds
    const eventPositions = sortedEvents.map(event => ({
      event,
      z: getEventZPosition(event, sortedEvents)
    }));
    
    const minZ = Math.min(...eventPositions.map(ep => ep.z));
    const maxZ = Math.max(...eventPositions.map(ep => ep.z));
    
    // Calculate viewport based on camera distance and FOV for responsive filtering
    
    // Use a distance-based approach that's more intuitive and accurate
    const distance = camera.position.distanceTo(cameraTarget);
    
    // Base viewport size on camera distance with reasonable scaling
    // Closer camera = smaller viewport (more zoomed in)
    // Further camera = larger viewport (more zoomed out)
    const baseViewportSize = Math.max(20, Math.min(distance * 0.8, windowSize * 2));
    const viewRadius = baseViewportSize * paddingFactor;
    
    // Center viewport on current position
    const visibleMinZ = currentPosition - viewRadius;
    const visibleMaxZ = currentPosition + viewRadius;
    
    // Filter events within viewport - simple and predictable
    let filtered = eventPositions
      .filter(ep => ep.z >= visibleMinZ && ep.z <= visibleMaxZ)
      .map(ep => ep.event);
    
    // Only apply max limit if we have too many events (performance protection)
    if (filtered.length > maxEvents) {
      // Too many events - prioritize by distance to current position
      const withDistances = filtered.map(event => ({
        event,
        distance: Math.abs(getEventZPosition(event, sortedEvents) - currentPosition)
      }));
      
      withDistances.sort((a, b) => a.distance - b.distance);
      filtered = withDistances
        .slice(0, maxEvents)
        .map(d => d.event)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    
    // Update cache
    lastUpdateRef.current = now;
    lastResultRef.current = filtered;
    
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
      const debugInfo = {
        totalEvents: events.length,
        visibleEvents: filtered.length,
        actualInViewport: eventsInViewport.length,
        reduction: `${reduction.toFixed(1)}%`,
        viewportBounds: `[${visibleMinZ.toFixed(1)}, ${visibleMaxZ.toFixed(1)}]`,
        viewportSize: (visibleMaxZ - visibleMinZ).toFixed(1),
        currentPosition: currentPosition.toFixed(1),
        eventZRange: `[${minZ.toFixed(1)}, ${maxZ.toFixed(1)}]`,
        viewCenter: currentPosition.toFixed(1),
        windowSize,
        cameraDistance: cameraDistance.toFixed(1),
        cameraPosition: `(${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`,
        cameraTarget: `(${cameraTarget.x.toFixed(1)}, ${cameraTarget.y.toFixed(1)}, ${cameraTarget.z.toFixed(1)})`,
        sampleEventZ: {
          first: firstEventZ,
          last: lastEventZ
        }
      };
      
      logger.debug('Viewport filtering:', debugInfo);
    }
    
    return filtered;
  }, [events, camera, cameraTarget, currentPosition, paddingFactor, maxEvents, updateThrottleMs, debugMode, windowSize, logger]);
};