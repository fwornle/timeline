import { TimelineEvent } from '../../data/types/TimelineEvent';

/**
 * Single source of truth for all timeline position calculations
 * This ensures consistency between event positioning, timeline display, and date calculations
 */

// Constants that MUST be used everywhere
export const TIMELINE_CONSTANTS = {
  MIN_SPACING: 5,
  MAX_LENGTH: 500,
  MIN_LENGTH: 100,
} as const;

/**
 * Calculate the actual timeline length based on number of events
 * This is the core function that all timeline calculations depend on
 */
export const calculateTimelineLength = (eventCount: number): number => {
  const desiredLength = eventCount * TIMELINE_CONSTANTS.MIN_SPACING;
  return Math.min(
    Math.max(desiredLength, TIMELINE_CONSTANTS.MIN_LENGTH),
    TIMELINE_CONSTANTS.MAX_LENGTH
  );
};

/**
 * Get the timeline bounds (start and end positions)
 * Timeline is centered at 0, so it runs from -length/2 to +length/2
 */
export const getTimelineBounds = (eventCount: number): { start: number; end: number } => {
  const length = calculateTimelineLength(eventCount);
  return {
    start: -length / 2,
    end: length / 2,
  };
};

/**
 * Calculate Z position for an event based on its timestamp
 * This matches the logic currently in TimelineEvents.tsx
 */
export const calculateEventZPosition = (
  event: TimelineEvent,
  minTime: number,
  maxTime: number,
  eventCount: number
): number => {
  // Validate inputs
  if (!event || !event.timestamp || !isFinite(minTime) || !isFinite(maxTime) || eventCount <= 0) {
    console.warn('Invalid input to calculateEventZPosition:', { event, minTime, maxTime, eventCount });
    return 0;
  }
  
  const eventTime = event.timestamp.getTime();
  if (!isFinite(eventTime)) {
    console.warn('Invalid event timestamp:', event);
    return 0;
  }
  
  const timeSpan = maxTime - minTime;
  
  // If all events have the same timestamp, we need the event index to spread them evenly
  if (timeSpan === 0) {
    // This requires the event index which we don't have here
    // We'll need to handle this case differently - return 0 for now
    return 0;
  }
  
  // Normalize time to [-0.5, 0.5]
  const normalizedTime = (eventTime - minTime) / timeSpan - 0.5;
  
  // Validate normalized time
  if (!isFinite(normalizedTime)) {
    console.warn('Invalid normalized time:', { normalizedTime, eventTime, minTime, timeSpan });
    return 0;
  }
  
  // Map to timeline position
  const timelineLength = calculateTimelineLength(eventCount);
  const position = normalizedTime * timelineLength;
  
  // Final validation
  if (!isFinite(position)) {
    console.warn('Invalid calculated position:', { position, normalizedTime, timelineLength });
    return 0;
  }
  
  return position;
};

/**
 * Calculate Z position for an event with event index (for same-timestamp handling)
 * This is the version that handles the edge case where all events have the same timestamp
 */
export const calculateEventZPositionWithIndex = (
  event: TimelineEvent,
  eventIndex: number,
  minTime: number,
  maxTime: number,
  eventCount: number
): number => {
  // Validate inputs
  if (!event || !event.timestamp || !isFinite(minTime) || !isFinite(maxTime) || eventCount <= 0) {
    console.warn('Invalid input to calculateEventZPositionWithIndex:', { event, minTime, maxTime, eventCount });
    return 0;
  }
  
  const eventTime = event.timestamp.getTime();
  if (!isFinite(eventTime)) {
    console.warn('Invalid event timestamp:', event);
    return 0;
  }
  
  const timeSpan = maxTime - minTime;
  
  // If all events have the same timestamp, spread them evenly
  if (timeSpan === 0) {
    const spacing = TIMELINE_CONSTANTS.MIN_SPACING;
    return (eventIndex - (eventCount - 1) / 2) * spacing;
  }
  
  // Use regular calculation for different timestamps
  return calculateEventZPosition(event, minTime, maxTime, eventCount);
};

/**
 * Convert a Z position to a date based on the timeline's time range
 */
export const positionToDate = (
  position: number,
  minTime: number,
  maxTime: number,
  eventCount: number
): Date => {
  // Handle edge cases
  if (!isFinite(position) || !isFinite(minTime) || !isFinite(maxTime) || eventCount <= 0) {
    console.warn('Invalid input to positionToDate:', { position, minTime, maxTime, eventCount });
    return new Date(minTime || Date.now());
  }
  
  const bounds = getTimelineBounds(eventCount);
  const timelineLength = bounds.end - bounds.start;
  
  // Prevent division by zero
  if (timelineLength === 0) {
    return new Date(minTime);
  }
  
  // Normalize position to [0, 1]
  const normalizedPosition = (position - bounds.start) / timelineLength;
  
  // Map to timestamp
  const timeRange = maxTime - minTime;
  
  // If all events at same time, return that time
  if (timeRange === 0) {
    return new Date(minTime);
  }
  
  const timestamp = minTime + (normalizedPosition * timeRange);
  
  // Ensure timestamp is valid
  if (!isFinite(timestamp)) {
    console.warn('Calculated invalid timestamp:', { timestamp, normalizedPosition, timeRange });
    return new Date(minTime);
  }
  
  return new Date(timestamp);
};

/**
 * Get the position where the first event should be (timeline start)
 */
export const getFirstEventPosition = (eventCount: number): number => {
  return getTimelineBounds(eventCount).start;
};

/**
 * Get the position where the last event should be (timeline end)
 */
export const getLastEventPosition = (eventCount: number): number => {
  return getTimelineBounds(eventCount).end;
};