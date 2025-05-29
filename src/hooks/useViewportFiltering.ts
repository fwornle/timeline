import { useMemo, useRef } from 'react';
import { Vector3, PerspectiveCamera, OrthographicCamera, Camera } from 'three';
import { TimelineEvent } from '../data/types/TimelineEvent';
import { useLogger } from '../utils/logging/hooks/useLogger';

interface ViewportFilteringConfig {
  paddingFactor?: number;
  minEvents?: number;
  maxEvents?: number;
  updateThrottleMs?: number;
  debugMode?: boolean;
}

export const useViewportFiltering = (
  events: TimelineEvent[],
  camera: Camera,
  cameraTarget: Vector3,
  currentPosition: number,
  config: ViewportFilteringConfig = {}
) => {
  const {
    paddingFactor = 1.2,
    minEvents = 30,
    maxEvents = 150,
    updateThrottleMs = 200,
    debugMode = false
  } = config;

  const logger = useLogger({ component: 'useViewportFiltering', topic: 'performance' });
  const lastUpdateRef = useRef<number>(0);
  const lastResultRef = useRef<TimelineEvent[]>([]);

  // Get event Z position (matching TimelineEvents.tsx logic)
  const getEventZPosition = (event: TimelineEvent, sortedEvents: TimelineEvent[]): number => {
    if (sortedEvents.length === 0) return 0;

    const minTime = sortedEvents[0].timestamp.getTime();
    const maxTime = sortedEvents[sortedEvents.length - 1].timestamp.getTime();
    const timeSpan = maxTime - minTime;

    if (timeSpan === 0) {
      const index = sortedEvents.findIndex(e => e.id === event.id);
      const spacing = 5;
      return (index - (sortedEvents.length - 1) / 2) * spacing;
    }

    const minSpacing = 5;
    const timelineLength = Math.max(sortedEvents.length * minSpacing, 100);
    const normalizedTime = (event.timestamp.getTime() - minTime) / timeSpan - 0.5;
    return normalizedTime * timelineLength;
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
    const timelineSpan = maxZ - minZ;
    
    // Calculate visible bounds based on camera
    let visibleMinZ: number;
    let visibleMaxZ: number;
    
    if (camera instanceof PerspectiveCamera) {
      // For perspective camera, calculate based on FOV and distance
      const distance = camera.position.distanceTo(cameraTarget);
      const fovRadians = (camera.fov * Math.PI) / 180;
      const visibleHeight = 2 * Math.tan(fovRadians / 2) * distance;
      const aspect = camera.aspect || 1;
      const visibleWidth = visibleHeight * aspect;
      
      // Use the larger dimension for viewport calculation
      const viewDistance = Math.max(visibleWidth, visibleHeight, 50); // Minimum 50 units
      
      // The viewport should be centered between camera and target, not just at target
      // Calculate the actual visible range along the Z axis
      const cameraZ = camera.position.z;
      const targetZ = cameraTarget.z;
      const centerZ = (cameraZ + targetZ) / 2;
      
      // Add extra range to ensure we see events
      const extraRange = viewDistance * 0.5;
      
      visibleMinZ = Math.min(cameraZ, targetZ) - extraRange * paddingFactor;
      visibleMaxZ = Math.max(cameraZ, targetZ) + extraRange * paddingFactor;
    } else if (camera instanceof OrthographicCamera) {
      // For orthographic camera
      const viewWidth = Math.abs(camera.right - camera.left);
      const viewHeight = Math.abs(camera.top - camera.bottom);
      const viewDistance = Math.max(viewWidth, viewHeight, 50);
      
      visibleMinZ = cameraTarget.z - viewDistance * paddingFactor;
      visibleMaxZ = cameraTarget.z + viewDistance * paddingFactor;
    } else {
      // Fallback - show everything
      visibleMinZ = minZ - 50;
      visibleMaxZ = maxZ + 50;
    }
    
    // Filter events within viewport
    let filtered = eventPositions
      .filter(ep => ep.z >= visibleMinZ && ep.z <= visibleMaxZ)
      .map(ep => ep.event);
    
    // Handle edge cases
    if (filtered.length === 0 && sortedEvents.length > 0) {
      // No events visible - find closest events to current position
      const sortedByDistance = eventPositions
        .map(ep => ({
          ...ep,
          distance: Math.abs(ep.z - currentPosition)
        }))
        .sort((a, b) => a.distance - b.distance);
      
      filtered = sortedByDistance
        .slice(0, minEvents)
        .map(ep => ep.event)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      if (debugMode) {
        logger.warn('No events in viewport, showing closest events', {
          currentPosition,
          closestEventZ: sortedByDistance[0]?.z.toFixed(1),
          visibleBounds: `[${visibleMinZ.toFixed(1)}, ${visibleMaxZ.toFixed(1)}]`
        });
      }
    } else if (filtered.length < minEvents && sortedEvents.length >= minEvents) {
      // Too few events - expand selection
      const currentIndex = sortedEvents.findIndex(e => 
        filtered.some(f => f.id === e.id)
      );
      const centerIndex = currentIndex >= 0 ? currentIndex : Math.floor(sortedEvents.length / 2);
      const halfMin = Math.floor(minEvents / 2);
      const startIndex = Math.max(0, centerIndex - halfMin);
      const endIndex = Math.min(sortedEvents.length, startIndex + minEvents);
      
      filtered = sortedEvents.slice(startIndex, endIndex);
    } else if (filtered.length > maxEvents) {
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
    
    // Log performance metrics
    if (events.length > 0) {
      const reduction = ((events.length - filtered.length) / events.length * 100);
      console.log('Viewport filtering:', {
        totalEvents: events.length,
        visibleEvents: filtered.length,
        reduction: `${reduction.toFixed(1)}%`,
        viewportBounds: `[${visibleMinZ.toFixed(1)}, ${visibleMaxZ.toFixed(1)}]`,
        cameraPos: `(${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`,
        cameraTarget: `(${cameraTarget.x.toFixed(1)}, ${cameraTarget.y.toFixed(1)}, ${cameraTarget.z.toFixed(1)})`
      });
    }
    
    return filtered;
  }, [events, camera, cameraTarget, currentPosition, paddingFactor, minEvents, maxEvents, updateThrottleMs, debugMode, logger]);
};