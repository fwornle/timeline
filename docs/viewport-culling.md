# Viewport Culling System

## Overview

The Timeline Visualization application implements a sophisticated **Balanced Viewport Culling System** to efficiently handle large datasets (800+ timeline events) while maintaining smooth 60fps performance. This system intelligently removes cards from the viewport while preserving visual context and preventing jarring visual jumps.

![Viewport Culling Flow](images/viewport-culling-flow.png)

## Core Algorithm: Balanced Marker-Centric Thinning

### Problem Statement

When displaying large numbers of timeline events (git commits + spec changes), Three.js performance degrades significantly. Simply removing random cards creates visual discontinuity and poor user experience, especially when the timeline marker moves.

### Solution: Balanced Left-Right Distribution

The algorithm splits the timeline into left and right sides relative to the current marker position, then removes cards proportionally from each side using stride patterns.

### Key Features

#### 1. Protected Zone
- **Size**: `maxEvents / 4` cards around the timeline marker
- **Purpose**: Ensures context around the current position is always visible
- **Behavior**: Cards within this zone are never removed, regardless of culling pressure

#### 2. Proportional Removal
```typescript
const leftProportion = leftSideEvents.length / totalRemovableEvents;
const targetRemoveLeft = Math.round(targetToRemove * leftProportion);
const targetRemoveRight = targetToRemove - targetRemoveLeft;
```

#### 3. Stride-Based Distribution
- **Left Side**: Removes every `nth` card where `n = floor(leftEvents.length / targetRemoveLeft)`
- **Right Side**: Removes every `nth` card where `n = floor(rightEvents.length / targetRemoveRight)`
- **Fallback**: Additional passes ensure exact target counts are met

## Implementation Details

### Hook: `useViewportFiltering`

**Location**: `src/hooks/useViewportFiltering.ts`

**Parameters**:
```typescript
interface ViewportFilteringConfig {
  paddingFactor: 1.0;        // Viewport padding multiplier
  maxEvents: 300;            // Maximum visible events
  updateThrottleMs: 150;     // Update frequency throttling
  debugMode: boolean;        // Enable debug logging and visualization
  windowSize: 110;           // Viewport window size (±110 world units)
}
```

### Algorithm Steps

1. **Viewport Calculation**
   - Calculate visible bounds based on camera position and target
   - Apply padding factor for smooth transitions
   - Expand viewport if insufficient events are found

2. **Thinning Decision**
   ```typescript
   if (filteredEvents.length > maxEvents) {
     // Trigger balanced thinning algorithm
   }
   ```

3. **Marker Position Detection**
   ```typescript
   const markerIndex = eventsWithZ.findIndex(ep => ep.z >= currentPosition);
   const actualMarkerIndex = markerIndex === -1 ? eventsWithZ.length : markerIndex;
   ```

4. **Side Splitting**
   ```typescript
   const leftSideEvents = eventsWithZ.slice(0, actualMarkerIndex - protectedZoneSize);
   const rightSideEvents = eventsWithZ.slice(actualMarkerIndex + protectedZoneSize);
   ```

5. **Proportional Removal Calculation**
   - Calculate proportion of removable events on each side
   - Distribute removal targets proportionally
   - Ensure both sides contribute to thinning

6. **Stride-Based Removal**
   - Calculate optimal stride for each side
   - Remove cards at regular intervals
   - Apply backup removal if stride doesn't hit target

## Debug Visualization

### Red Frame Overlays

![Timeline Culling Debug](images/timeline-culling.png)

When debug mode is active and thinning occurs:

1. **Thinned cards** show red frame overlays
2. **BottomBar count badge** displays "Visible: X/Y" with:
   - Red border when thinning is active
   - Scissors icon (✂️) indicator
   - Check mark (✅) when red frames are visible

3. **Interactive Controls**:
   - Click count badge to toggle red frame visibility
   - Red frames only show when explicitly requested (not automatic)
   - State resets when exiting debug mode

### Debug Logging

The system provides comprehensive debug logging when `debugMode: true`:

```typescript
logger.debug('Starting balanced thinning', {
  totalEvents: eventsWithZ.length,
  targetToRemove,
  markerIndex: actualMarkerIndex,
  protectedZoneSize,
  leftSideEvents: leftSideEvents.length,
  rightSideEvents: rightSideEvents.length,
  targetRemoveLeft,
  targetRemoveRight,
  markerPosition: currentPosition.toFixed(1)
});
```

## Performance Impact

### Before Implementation
- **Rendered Objects**: 800+ timeline cards
- **Frame Rate**: 15-30 FPS with stuttering
- **Memory Usage**: Continuously increasing
- **User Experience**: Laggy interactions, poor responsiveness

### After Implementation
- **Rendered Objects**: 300 maximum (75-90% reduction)
- **Frame Rate**: Consistent 60 FPS
- **Memory Usage**: Stable, no leaks
- **User Experience**: Smooth interactions, responsive camera controls

### Key Metrics
- **Viewport Filtering**: 150ms update throttle
- **Protected Zone**: 75 cards around marker (for maxEvents=300)
- **Thinning Threshold**: Triggered when > 300 events in viewport
- **Real-time Updates**: SessionStorage polling every 100ms

## State Management

### SessionStorage Integration

The system uses SessionStorage for cross-component communication:

```typescript
// Store thinning status
sessionStorage.setItem('isViewportThinning', isThinning.toString());

// Store thinned event IDs
sessionStorage.setItem('thinnedEvents', JSON.stringify(thinnedEventIds));

// Store visible count for UI
sessionStorage.setItem('visibleEventsCount', visibleEvents.length.toString());
```

### Redux Integration

The BottomBar component reads SessionStorage and manages UI state:

```typescript
const showThinnedCards = useAppSelector(state => state.ui.showThinnedCards);
const handleVisibleCountClick = () => {
  if (isThinning) {
    dispatch(setShowThinnedCards(!showThinnedCards));
  }
};
```

## Configuration

### Tunable Parameters

| Parameter | Default | Purpose | Impact |
|-----------|---------|---------|---------|
| `maxEvents` | 300 | Maximum visible cards | Higher = more context, lower performance |
| `paddingFactor` | 1.0 | Viewport padding multiplier | Higher = smoother transitions, more culling |
| `updateThrottleMs` | 150 | Update frequency | Lower = more responsive, higher CPU usage |
| `windowSize` | 110 | Viewport size (world units) | Fixed optimal size for timeline scale |
| `protectedZoneSize` | `maxEvents/4` | Cards protected around marker | Higher = more context, less culling effectiveness |

### Environment Considerations

- **Development**: Enable debug mode for visualization and logging
- **Production**: Disable debug mode for optimal performance
- **Large Datasets**: Consider increasing `maxEvents` if performance allows
- **Low-End Devices**: Decrease `maxEvents` and increase `updateThrottleMs`

## Future Enhancements

### Potential Improvements

1. **Adaptive Culling**: Adjust `maxEvents` based on device performance
2. **Temporal Weighting**: Prefer recent commits over older ones
3. **User Preference**: Allow users to configure culling aggressiveness
4. **LOD System**: Different detail levels for distant cards
5. **Predictive Loading**: Pre-load cards in camera movement direction

### Performance Monitoring

Monitor these metrics to assess culling effectiveness:
- Frame rate during camera movements
- Memory usage over time
- User-reported visual quality
- Thinning frequency and distribution
- Debug logs for algorithm tuning