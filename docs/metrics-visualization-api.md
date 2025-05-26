# Metrics Visualization API Reference

## Overview

The Horizontal Metrics Plot is a PlotJuggler-inspired component that provides real-time code evolution visualization. It displays Lines of Code (LOC), Files, and Commits over time with synchronized navigation to the 3D timeline.

## Components

### HorizontalMetricsPlot

Main component for displaying code evolution metrics over time.

```typescript
interface HorizontalMetricsPlotProps {
  events: TimelineEvent[];
  currentPosition?: number;
  timelineLength?: number;
  startDate?: Date;
  endDate?: Date;
  onPositionChange?: (position: number) => void;
  height?: number;
  className?: string;
}
```

#### Props

- **`events`** (`TimelineEvent[]`): Array of timeline events to visualize
- **`currentPosition`** (`number`, optional): Current timeline marker position (-timelineLength/2 to +timelineLength/2)
- **`timelineLength`** (`number`, optional): Total length of timeline (default: 100)
- **`startDate`** (`Date`, optional): Start date of timeline period
- **`endDate`** (`Date`, optional): End date of timeline period
- **`onPositionChange`** (`function`, optional): Callback when user clicks chart to change position
- **`height`** (`number`, optional): Component height in pixels (default: 150)
- **`className`** (`string`, optional): Additional CSS classes

#### Features

- **Expandable Interface**: Compact (60px) and expanded (150px) modes
- **Interactive Filtering**: Toggle LOC, Files, and Commits visibility
- **Synchronized Navigation**: Click chart to move 3D timeline marker
- **Professional Styling**: SVG-based rendering with grid lines and hover effects

## Data Types

### CodeMetricsPoint

Represents a single point in the metrics timeline.

```typescript
interface CodeMetricsPoint {
  timestamp: Date;
  cumulativeLinesOfCode: number;
  totalFiles: number;
  commitCount: number;
  linesAdded: number;
  linesDeleted: number;
  filesAdded: number;
  filesModified: number;
  filesDeleted: number;
}
```

### MetricsDataset

Configuration for chart rendering.

```typescript
interface MetricsDataset {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  fill: boolean;
  tension: number;
  pointRadius: number;
  pointHoverRadius: number;
}
```

## Utility Functions

### calculateCodeMetrics

Processes timeline events into metrics points with time interpolation.

```typescript
function calculateCodeMetrics(events: TimelineEvent[]): CodeMetricsPoint[]
```

**Features:**
- Time interpolation for realistic activity patterns
- Cumulative metric calculation
- Handles periods of inactivity (flat lines)
- Daily intervals or density-based sampling

### findClosestMetricsPoint

Finds the metrics point closest to a given timestamp.

```typescript
function findClosestMetricsPoint(
  metricsPoints: CodeMetricsPoint[],
  timestamp: Date
): CodeMetricsPoint | null
```

### positionToTimestamp

Converts timeline position to timestamp.

```typescript
function positionToTimestamp(
  position: number,
  timelineLength: number,
  startDate: Date,
  endDate: Date
): Date
```

## Configuration

### Metrics Configuration

```typescript
const metricsConfig = {
  layout: {
    compactHeight: 60,
    expandedHeight: 150
  },
  chart: {
    width: 800,
    height: 120,
    margin: { top: 10, right: 20, bottom: 20, left: 40 }
  },
  colors: {
    linesOfCode: {
      line: '#3b82f6',      // Blue
      background: 'rgba(59, 130, 246, 0.1)'
    },
    totalFiles: {
      line: '#10b981',      // Green
      background: 'rgba(16, 185, 129, 0.1)'
    },
    commitCount: {
      line: '#f59e0b',      // Orange
      background: 'rgba(245, 158, 11, 0.1)'
    }
  }
}
```

## Usage Examples

### Basic Usage

```typescript
import { HorizontalMetricsPlot } from './components/metrics/HorizontalMetricsPlot';

function TimelineVisualization() {
  const { events, period } = useTimelineData();
  const [currentPosition, setCurrentPosition] = useState(0);

  return (
    <div>
      <HorizontalMetricsPlot
        events={events}
        currentPosition={currentPosition}
        timelineLength={100}
        startDate={period?.start}
        endDate={period?.end}
        onPositionChange={setCurrentPosition}
      />
      {/* 3D Timeline Scene */}
    </div>
  );
}
```

### With Custom Styling

```typescript
<HorizontalMetricsPlot
  events={events}
  currentPosition={markerPosition}
  onPositionChange={handlePositionChange}
  height={200}
  className="custom-metrics-plot"
/>
```

### Synchronized with Redux

```typescript
function ConnectedMetricsPlot() {
  const dispatch = useAppDispatch();
  const { events } = useAppSelector(state => state.timeline);
  const { markerPosition } = useAppSelector(state => state.timeline);

  const handlePositionChange = useCallback((position: number) => {
    dispatch(updateTimelinePosition({ position, updateCamera: true }));
  }, [dispatch]);

  return (
    <HorizontalMetricsPlot
      events={events}
      currentPosition={markerPosition}
      onPositionChange={handlePositionChange}
    />
  );
}
```

## Integration Points

### Redux Integration

The component integrates with the Redux store through:

- **Timeline Slice**: Receives events and marker position
- **UI Intents**: Dispatches position updates via `updateTimelinePosition`
- **Preferences**: Respects user theme and animation settings

### 3D Timeline Synchronization

- **Bidirectional Sync**: Chart clicks update 3D timeline marker
- **Position Updates**: 3D marker movement updates chart indicator
- **Unified Navigation**: Seamless interaction between 2D and 3D views

### Logging Integration

Uses the application's logging system for debugging:

```typescript
Logger.debug(Logger.Categories.DATA, 'Metrics calculation completed', {
  pointsCount: metricsPoints.length,
  timeSpan: totalTimeSpan
});
```

## Performance Considerations

- **Memoization**: Expensive calculations cached with `useMemo`
- **Debounced Updates**: User interactions debounced to prevent excessive re-renders
- **Efficient Rendering**: SVG-based rendering with minimal DOM updates
- **Time Interpolation**: Optimized algorithm for realistic activity patterns

## Accessibility

- **Keyboard Navigation**: Support for keyboard interactions
- **Screen Reader**: Proper ARIA labels and descriptions
- **High Contrast**: Respects user's color preferences
- **Responsive Design**: Adapts to different screen sizes
