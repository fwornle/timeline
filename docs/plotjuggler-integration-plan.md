# PlotJuggler Integration Plan for Timeline App

## Overview
This document outlines approaches to integrate PlotJuggler-like functionality into the Timeline app to show code evolution metrics over time.

## Recommended Approach: Web-Native Implementation

### Libraries to Consider
1. **Chart.js** - Lightweight, responsive charts
2. **D3.js** - Powerful data visualization
3. **Plotly.js** - Interactive scientific charts
4. **Observable Plot** - Grammar of graphics for web
5. **Recharts** - React-specific charting library

### Implementation Plan

#### Phase 1: Data Collection & Processing
- Extract lines of code metrics from git commits
- Calculate cumulative code growth over time
- Store metrics in timeline data structure

#### Phase 2: Horizontal Plot Component
- Create narrow horizontal plot component
- Position below/above the 3D timeline
- Sync time axis with 3D timeline marker
- Show code metrics evolution

#### Phase 3: Interactive Features
- Hover to show detailed metrics
- Click to jump to specific time points
- Zoom and pan capabilities
- Multiple metric overlays (files, lines, complexity)

### Metrics to Display
- **Lines of Code**: Total, added, deleted
- **File Count**: Total files in repository
- **Commit Frequency**: Commits per time period
- **Code Complexity**: If available from analysis
- **Team Activity**: Contributors over time

### UI Integration
- Narrow horizontal strip (100-200px height)
- Positioned above or below main timeline
- Synchronized time axis with 3D timeline
- Collapsible/expandable
- Multiple chart types (line, area, bar)

## Alternative Approaches

### Approach 2: PlotJuggler as External Process
- Launch PlotJuggler as separate process
- Export data to PlotJuggler-compatible formats
- Use IPC for basic synchronization
- **Pros**: Full PlotJuggler functionality
- **Cons**: Complex setup, platform dependencies

### Approach 3: PlotJuggler WebAssembly Port
- Compile PlotJuggler to WebAssembly
- Embed in web application
- **Pros**: Native PlotJuggler experience
- **Cons**: Significant development effort, large bundle size

### Approach 4: PlotJuggler-Inspired Custom Component
- Build custom plotting component inspired by PlotJuggler
- Focus on time series visualization
- **Pros**: Tailored to Timeline app needs
- **Cons**: Development time investment

## Technical Implementation Details

### Data Structure Extensions
```typescript
interface TimelineMetrics {
  timestamp: Date;
  linesOfCode: number;
  fileCount: number;
  commitCount: number;
  contributors: string[];
  complexity?: number;
}

interface GitTimelineEvent {
  // ... existing properties
  metrics: TimelineMetrics;
}
```

### Component Architecture
```
TimelineVisualization
├── TopBar
├── HorizontalPlot (NEW)
│   ├── MetricsChart
│   ├── TimeAxis (synced)
│   └── InteractionLayer
├── Timeline3D
└── BottomBar
```

### Synchronization Strategy
- Shared time state between 3D timeline and horizontal plot
- Unified marker position
- Coordinated zoom/pan operations
- Event-driven updates

## Benefits of Integration

1. **Enhanced Analytics**: Quantitative view of code evolution
2. **Pattern Recognition**: Identify development phases and trends
3. **Team Insights**: Visualize team productivity and collaboration
4. **Project Health**: Monitor code growth and complexity
5. **Historical Context**: Correlate code changes with timeline events

## Implementation Priority

**High Priority**:
- Basic lines of code tracking
- Simple line chart visualization
- Time axis synchronization

**Medium Priority**:
- Multiple metrics overlay
- Interactive hover details
- Chart type selection

**Low Priority**:
- Advanced analytics
- Export capabilities
- Custom metric definitions

## Conclusion

The web-native approach using libraries like Chart.js or D3.js is most practical for integrating PlotJuggler-like functionality. This provides the analytical power needed while maintaining the web-based architecture of the Timeline app.
