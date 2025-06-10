# React Performance Profiling System

This document covers the comprehensive React performance profiling system built into the timeline visualization application.

## Overview

The performance profiling system provides detailed monitoring and analysis of React component performance, Three.js operations, animation frames, and browser-level performance metrics. It's designed to help identify performance bottlenecks and optimize the 3D timeline visualization.

## Core Components

### ReactProfiler (`src/utils/performance/ReactProfiler.ts`)

The main profiling engine that tracks:

- Component render times
- Function execution duration
- Long browser tasks (>50ms)
- React scheduler operations
- Custom performance markers

### Performance Hooks (`src/utils/performance/usePerformanceProfiler.ts`)

Three specialized React hooks for different types of performance monitoring:

#### `usePerformanceProfiler`

- Tracks component mount/unmount lifecycle
- Monitors render frequency and timing
- Provides wrapper functions for profiling expensive operations
- Records component-specific performance statistics

#### `useAnimationProfiler`

- Monitors animation frame performance
- Tracks frames exceeding 16.67ms (below 60fps)
- Provides frame statistics and slow frame detection

#### `useThreeJsProfiler`

- Specialized profiling for Three.js operations
- Tracks render, animation, and geometry operations
- Identifies expensive 3D graphics operations

## Configuration

### Automatic Initialization

The system initializes automatically in development mode via `src/utils/performance/index.ts`:

```typescript
// Performance monitoring configuration
export const performanceConfig = {
  enabled: process.env.NODE_ENV === 'development',
  thresholds: {
    warning: 5,    // React's default warning threshold
    error: 16,     // One frame at 60fps
    animation: 16.67 // 60fps target
  },
  criticalComponents: [
    'TimelineVisualization',
    'TimelineScene', 
    'TimelineCard',
    'TimelineEvents',
    'TimelineCamera',
    'HorizontalMetricsPlot'
  ]
};
```

### Performance Thresholds

- **Warning**: 5ms (React's default warning threshold)
- **Error**: 16ms (one frame at 60fps)
- **Animation**: 16.67ms (60fps target)

## Usage

### Enabling/Disabling Profiling

The profiler is **disabled by default** to avoid performance overhead. Enable it using the global debugging utilities:

```javascript
// Enable profiling
window.perfDebug.enable()

// Disable profiling  
window.perfDebug.disable()

// Check status
window.perfDebug.status()
```

### Manual Function Profiling

Wrap expensive operations for detailed timing:

```typescript
import { usePerformanceProfiler } from '../utils/performance';

function MyComponent() {
  const { profileFunction, trackExpensiveOperation } = usePerformanceProfiler({
    componentName: 'MyComponent',
    enabled: true,
    threshold: 5
  });

  const expensiveCalculation = profileFunction('calculation', () => {
    // Expensive operation here
    return computeComplexData();
  });

  const handleClick = () => {
    trackExpensiveOperation('userInteraction', () => {
      // Track user interaction performance
      processUserInput();
    });
  };
}
```

### Three.js Profiling

Monitor 3D graphics operations:

```typescript
import { useThreeJsProfiler } from '../utils/performance';

function ThreeJsComponent() {
  const { profileRender, profileGeometry } = useThreeJsProfiler('ThreeScene', true);

  useFrame(() => {
    profileRender(() => {
      renderer.render(scene, camera);
    });
  });

  const geometry = profileGeometry(() => {
    return new BoxGeometry(1, 1, 1);
  });
}
```

### Animation Performance Monitoring

Track animation frame performance:

```typescript
import { useAnimationProfiler } from '../utils/performance';

function AnimatedComponent() {
  const { trackFrame, getFrameStats } = useAnimationProfiler('Animator', true);

  useFrame(() => {
    trackFrame(() => {
      // Animation code here
      updateAnimations();
    });
  });
}
```

## Performance Reports and Analysis

### Console Commands

The system provides comprehensive debugging commands available via `window.perfDebug`:

```javascript
// Generate detailed performance report
window.perfDebug.report()

// Get performance summary
window.perfDebug.summary()

// Analyze performance patterns
window.perfDebug.analyze()

// Export detailed analysis to JSON file
window.perfDebug.writeToFile('my-performance-report.json')

// View raw performance entries
window.perfDebug.rawEntries()

// Clear performance data
window.perfDebug.clear()
```

### Report Structure

Performance reports include:

- **Total Operations**: Number of tracked operations
- **Average Duration**: Mean execution time across all operations
- **Max Duration**: Longest single operation
- **Slow Operations**: Operations exceeding warning threshold (5ms)
- **Component Stats**: Per-component performance breakdown
- **Long Tasks**: Browser-detected long tasks (>50ms)
- **Recommendations**: Actionable optimization suggestions

### Component Performance Stats

Each monitored component provides:

- Operation count
- Average duration
- Maximum duration
- Render frequency analysis

## Integration with Logging System

The profiler integrates with the application's logging system (`src/utils/logging/Logger.ts`):

- Performance events are logged to the `PERFORMANCE` category
- Slow operations trigger warnings
- Long tasks generate debug messages
- All logging respects the current debug mode settings

### Enabling Performance Logging

```javascript
// Enable DEBUG level logging for performance
window.logger.setLevel('DEBUG');
window.logger.setCategory('PERFORMANCE', true);
```

## Browser Performance Monitoring

### Long Task Detection

Automatically monitors browser-level long tasks using the PerformanceObserver API:

- Detects tasks >50ms
- Logs task details and impact
- Helps identify render blocking operations

### Layout Shift Monitoring

Tracks Cumulative Layout Shift (CLS) events:

- Detects shifts >0.1 threshold
- Identifies visual stability issues
- Logs layout shift timing and impact

## Component Wrapping

### ReactProfilerComponent

A React Profiler wrapper component for automatic monitoring:

```typescript
import { ReactProfilerComponent } from '../utils/performance';

function App() {
  return (
    <ReactProfilerComponent name="App">
      <MyComponent />
    </ReactProfilerComponent>
  );
}
```

## Performance Optimization Workflow

### 1. Enable Profiling

```javascript
window.perfDebug.enable()
```

### 2. Reproduce Performance Issues

Interact with the application to trigger the slow operations.

### 3. Analyze Results

```javascript
window.perfDebug.analyze()
```

### 4. Export Detailed Report

```javascript
window.perfDebug.writeToFile()
```

### 5. Implement Optimizations

Based on the analysis, implement targeted optimizations.

### 6. Validate Improvements

Re-run profiling to confirm performance improvements.

## Common Performance Patterns

### Timeline Card Optimization

Individual TimelineCard operations are typically fast (0-0.1ms), but rendering many cards simultaneously can cause:

- React reconciliation overhead
- Excessive re-renders
- Long browser tasks during virtual DOM updates

**Solution**: Implement viewport culling and React.memo optimization.

### Three.js Render Optimization

Monitor these key areas:

- Geometry creation/updates
- Material changes
- Render loop performance
- Scene complexity

### Animation Performance

Track animation frames to ensure 60fps performance:

- Identify frames >16.67ms
- Monitor animation frame consistency
- Detect dropped frames

## Files and Architecture

### Key Files

- `src/utils/performance/ReactProfiler.ts` - Core profiling engine
- `src/utils/performance/usePerformanceProfiler.ts` - React hooks for profiling
- `src/utils/performance/index.ts` - Configuration and global debugging utilities

### Integration Points

- Initialized in `src/main.tsx` (development mode only)
- Used throughout critical components in `src/components/three/`
- Integrated with logging system in `src/utils/logging/`

### State Management

- No Redux state required
- Uses singleton pattern for global profiler instance
- Performance data stored in memory (not persisted)

## Best Practices

### When to Use Profiling

1. **Development only** - Avoid in production due to overhead
2. **Performance investigations** - Enable when debugging slow operations
3. **Before optimizations** - Establish baseline measurements
4. **After optimizations** - Validate improvements

### Profiling Strategy

1. **Start broad** - Use `window.perfDebug.analyze()` for overview
2. **Focus specific** - Target slow components identified in reports
3. **Measure incrementally** - Test one optimization at a time
4. **Document findings** - Export reports for future reference

### Component Integration

- Use profiling hooks in performance-critical components
- Wrap expensive operations with profiling functions
- Monitor both sync and async operations
- Track component lifecycle performance

## Troubleshooting

### Profiling Not Working

1. Ensure development mode: `process.env.NODE_ENV === 'development'`
2. Check if profiling is enabled: `window.perfDebug.status()`
3. Verify logging levels include `DEBUG` and `PERFORMANCE`

### No Performance Data

1. Enable profiling: `window.perfDebug.enable()`
2. Trigger operations to be measured
3. Check browser console for performance logs
4. Verify PerformanceObserver API support

### Misleading Results

1. Clear previous data: `window.perfDebug.clear()`
2. Ensure consistent testing conditions
3. Account for browser background tasks
4. Run multiple measurement cycles for accuracy

## Performance Monitoring Philosophy

The system is designed around these principles:

1. **Minimal Overhead**: Disabled by default, only measures when needed
2. **Comprehensive Coverage**: Tracks React, Three.js, and browser performance
3. **Actionable Insights**: Provides specific optimization recommendations
4. **Developer Experience**: Easy-to-use console commands and detailed reports
5. **Integration**: Works seamlessly with existing logging and debugging systems

This profiling system enables data-driven performance optimization, helping maintain smooth 60fps performance in the complex 3D timeline visualization.

## React Rendering Optimizations (2024)

Based on performance profiling data showing long tasks (84ms+) in React rendering pipeline, comprehensive optimizations were implemented to address drift mode performance issues.

### Performance Issue Analysis

**Problem Identified**:
- Drift mode was slow and jerky
- Performance profiler detected long browser tasks (84ms+) not captured in function-level profiling
- Root cause: React processing too many components simultaneously
- Individual TimelineCard operations were fast (0-0.1ms each), but collective rendering was expensive

**Profiler Findings**:
```
💡 Key Findings
❌ Issue: Long tasks (84ms+) detected by browser but NOT in our profiling
🎯 Reason: Expensive work is in React rendering pipeline, not individual functions
✅ TimelineCard performance: Individual operations are fast (0-0.1ms each)
🔴 Real culprit: React processing too many components simultaneously
```

### Optimization Strategy Implementation

#### 1. Component Count Reduction

**Viewport Culling Optimization**:
```typescript
// Before: Fixed 300 max events
maxEvents: 300

// After: Dynamic reduction based on mode
const maxEventsForMode = props.droneMode ? 200 : 250;
maxEvents: maxEventsForMode // 20-33% fewer rendered components
```

**Impact**:
- 20% reduction in normal mode (300 → 250 components)
- 33% reduction in drone mode (300 → 200 components)
- Significantly reduced React reconciliation overhead

#### 2. Enhanced React.memo Usage

**Component Memoization Improvements**:

```typescript
// ViewportFilteredEvents: Fixed memo comparison logic
export const ViewportFilteredEvents = React.memo((props) => {
  // ... component logic
}, (prevProps, nextProps) => {
  const propsEqual = (
    prevProps.events === nextProps.events &&
    prevProps.selectedCardId === nextProps.selectedCardId &&
    // Only re-render for significant position changes (>= 1.0 world units)
    Math.abs(prevProps.currentPosition - nextProps.currentPosition) < 1.0 &&
    // Only re-render for significant camera target changes (>= 2.0 world units)
    prevProps.cameraTarget.distanceTo(nextProps.cameraTarget) < 2.0
  );
  
  return propsEqual; // Return true to skip re-render when props are equal
});

// TimelineEvents: Added memoization to heavy component
export const TimelineEvents = memo(TimelineEventsComponent);
```

**TimelineCard Already Optimized**:
- Component already had "ultra-aggressive memoization"
- Used sophisticated custom comparison function
- Higher thresholds for position, opacity, scale, and rotation changes

#### 3. State Update Batching and Throttling

**Redux Dispatch Optimization**:

```typescript
// Before: Direct dispatches causing frequent re-renders
dispatch(setIsViewportThinning(isThinning));
dispatch(setThinnedEvents(thinnedEventsArray));

// After: Throttled dispatches to batch rapid changes
useEffect(() => {
  const timeoutId = setTimeout(() => {
    dispatch(setIsViewportThinning(isThinning));
    dispatch(setThinnedEvents(thinnedEvents));
  }, 50); // 50ms throttle to batch rapid changes

  return () => clearTimeout(timeoutId);
}, [dispatch, isThinning, thinnedEvents.length]);
```

**Viewport Filtering Update Frequency**:
- Increased throttle from 150ms to 200ms
- Reduced calculation frequency during rapid camera movements
- Better balance between responsiveness and performance

#### 4. State Centralization Migration

**Eliminated sessionStorage Polling**:

```typescript
// Before: Expensive polling intervals
useEffect(() => {
  const interval = setInterval(() => {
    const count = sessionStorage.getItem('visibleEventsCount');
    setCurrentVisibleCount(parseInt(count, 10));
  }, 100); // Constant CPU usage
  return () => clearInterval(interval);
}, []);

// After: Direct Redux state subscription
const currentVisibleCount = useAppSelector(state => state.ui.visibleEventsCount);
const isThinning = useAppSelector(state => state.ui.isViewportThinning);
```

**Local State Migration to Redux**:
- Moved `isMarkerDragging` and `isTimelineHovering` from local state to Redux
- Eliminated component state management overhead
- Better debugging and performance monitoring

### Performance Improvements Achieved

#### Quantitative Results

**Component Rendering**:
- 20-33% fewer rendered components during drift operations
- Reduced React reconciliation cycles
- Lower memory pressure from fewer active components

**State Management**:
- Eliminated 100ms polling intervals (constant CPU reduction)
- Throttled Redux dispatches (50-100ms delays)
- Reduced re-render frequency through better memoization

**Update Frequency**:
- Viewport filtering: 150ms → 200ms throttle
- State updates: Batched via setTimeout delays
- Better performance during rapid camera movements

#### Qualitative Improvements

**User Experience**:
- Smoother drift mode operation
- Reduced jerkiness during camera movements
- Maintained visual quality with fewer rendered components

**Development Experience**:
- Centralized state management for better debugging
- Performance bottlenecks more easily identifiable
- Consistent state patterns across components

### Performance Monitoring Integration

**Profiler Configuration Updates**:

```typescript
// Enhanced performance profiling for state management
const performanceProfilingEnabled = useAppSelector(state => state.ui.performanceProfilingEnabled);

// Dynamic profiling based on Redux state
useEffect(() => {
  if (performanceProfilingEnabled) {
    enableAdvancedProfiling();
  } else {
    disableAdvancedProfiling();
  }
}, [performanceProfilingEnabled]);
```

**Real-time Performance Metrics**:
- Component render frequency tracking
- State update frequency monitoring
- Redux dispatch timing analysis
- Memory usage patterns for rendered components

### Best Practices Established

1. **Component Count Management**: Dynamic `maxEvents` based on interaction mode
2. **Memoization Strategy**: Aggressive React.memo with threshold-based comparisons
3. **State Update Batching**: Throttled dispatches to prevent render cascades
4. **Centralized State**: Migrate shared state from local component state to Redux
5. **Performance-First Design**: Consider rendering cost when adding new features

These optimizations directly address the performance profiler findings and provide a foundation for maintaining 60fps performance in complex 3D visualizations.