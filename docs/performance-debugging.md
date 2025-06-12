# Performance Debugging Guide

This guide explains how to use the performance profiling tools to identify and fix the "message handler took X ms" warnings you're seeing.

## Overview

The "message handler took X ms" warnings come from React's Concurrent Mode detecting that JavaScript tasks are taking longer than 5ms, which can block the main thread and cause janky user experiences.

## Performance Monitoring Setup

Performance monitoring is **disabled by default** to avoid overhead during normal development. You can enable it in two ways:

### Method 1: UI Toggle (Recommended)

1. Enable DEBUG mode by clicking the bug icon (🐛) in the bottom bar
2. Click the performance profiling toggle button (speedometer icon 📊) that appears in DEBUG mode
3. You'll see logging messages confirming profiling is enabled

### Method 2: Console Commands

You should see a console message when the app starts:

```
🚀 Performance monitoring initialized (disabled by default - use UI toggle in DEBUG mode)
💡 Use window.perfDebug to control profiling:
   - window.perfDebug.enable() - Enable profiling
   - window.perfDebug.disable() - Disable profiling
   - window.perfDebug.report() - Show current performance report
   - window.perfDebug.clear() - Clear performance data
```

## How to Debug Performance Issues

### 1. Monitor Real-Time Performance

Open your browser's dev console (`F12`) and run:

```javascript
// Get a performance report
window.perfDebug.report()
```

This will show you:
- Total operations tracked
- Slow operations (>5ms)
- Component performance statistics
- Which operations are taking the longest

### 2. Watch for Automatic Warnings

The system automatically logs warnings for:
- **Warning threshold (5ms)**: Yellow warnings for operations that might cause jank
- **Error threshold (16ms)**: Red errors for operations that definitely cause dropped frames

### 3. Identify Problem Areas

Look for these common performance issues:

#### Timeline Card Animation
- **Symptom**: "TimelineCard-XXXXXX.three.animation took XXms"
- **Cause**: Complex card positioning calculations during hover/animation
- **Fix**: Reduce animation complexity or throttle updates

#### Event Position Calculations
- **Symptom**: "TimelineEvents.eventPositionCalculation took XXms"
- **Cause**: Recalculating positions for many events
- **Fix**: Better memoization or viewport culling

#### Text Content Generation
- **Symptom**: "TimelineCard-XXXXXX.textContent took XXms"
- **Cause**: Complex string processing for card text
- **Fix**: Simplify text formatting or cache results

#### Timeline Card Rendering
- **Symptom**: "TimelineEvents.renderTimelineCards took XXms"
- **Cause**: Rendering too many cards simultaneously
- **Fix**: Implement virtual scrolling or better viewport filtering

### 4. Component-Specific Monitoring

Each major component has been instrumented:

- **TimelineCard**: Tracks animation, positioning, and text generation
- **TimelineEvents**: Tracks position calculations and card rendering
- **Other components**: Can be easily added using the performance hooks

### 5. Monitor Animation Performance

For Three.js animations specifically, the profiler tracks:
- Render operations
- Animation calculations
- Geometry updates

## Performance Optimization Strategies

### 1. Throttling and Debouncing

```javascript
// Animation updates are throttled to 60fps
if (now - lastAnimationUpdateRef.current < 16) {
  return; // Skip this frame
}
```

### 2. Memoization

Expensive calculations are wrapped with `useMemo` and profiled:

```javascript
const expensiveValue = useMemo(() => {
  return trackExpensiveOperation('calculationName', () => {
    // Expensive computation here
  });
}, [dependencies]);
```

### 3. Viewport Culling

Only render cards that are visible in the current viewport.

### 4. Batching Updates

Group multiple state updates together to avoid multiple re-renders.

## Manual Profiling

You can add custom profiling to any component:

```javascript
import { usePerformanceProfiler } from '../utils/performance/usePerformanceProfiler';

function MyComponent() {
  const { trackExpensiveOperation } = usePerformanceProfiler({
    componentName: 'MyComponent',
    enabled: process.env.NODE_ENV === 'development',
    threshold: 5
  });

  const doSomethingExpensive = () => {
    return trackExpensiveOperation('myOperation', () => {
      // Your expensive code here
    });
  };
}
```

## Expected Performance Targets

- **Animation frames**: < 16.67ms (60fps)
- **User interactions**: < 5ms (React's threshold)
- **Data processing**: < 10ms per operation
- **Text rendering**: < 2ms per card

## Next Steps

1. **Visit http://localhost:3001** in your browser
2. **Open browser dev tools** (`F12`)
3. **Interact with the timeline** (hover over cards, scroll, etc.)
4. **Run `window.perfDebug.report()`** to see performance data
5. **Identify the slowest operations** from the report
6. **Focus optimization efforts** on the operations taking the most time

The profiler will automatically log warnings as they occur, so you can see in real-time which operations are causing the "message handler took X ms" warnings.