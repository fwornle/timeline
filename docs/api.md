# API Documentation

## Component API Reference

### TimelineVisualization

The main component for rendering the 3D timeline visualization.

```typescript
interface TimelineVisualizationProps {
  repoUrl: string;              // Git repository URL
  animationSpeed: number;       // Animation speed multiplier
  autoDrift: boolean;          // Enable/disable auto-scrolling
  onLoadingChange: (isLoading: boolean) => void;
  onError: (error: Error | null) => void;
}
```

Example usage:
```tsx
<TimelineVisualization
  repoUrl="https://github.com/user/repo"
  animationSpeed={1.5}
  autoDrift={true}
  onLoadingChange={setIsLoading}
  onError={handleError}
/>
```

### TimelineScene

Manages the Three.js scene and renders timeline events.

```typescript
interface TimelineSceneProps {
  events: TimelineEvent[];
  selectedCardId: string | null;
  cameraTarget: Vector3;
  onCardSelect: (id: string) => void;
  onCardHover: (id: string | null) => void;
  onCardPositionUpdate: (id: string, position: Vector3) => void;
  getCardAnimationProps: (id: string) => CardAnimationProps;
}
```

### TimelineCamera

Controls camera positioning and movement in the 3D scene.

```typescript
interface TimelineCameraProps {
  target: Vector3;
  distance: number;
  smoothing: number;
  onPositionChange?: (position: Vector3) => void;
}
```

## Configuration Options

### Default Configuration

Located in `src/config/defaultConfig.ts`:

```typescript
interface TimelineConfig {
  animation: {
    speed: number;             // Default: 1
    autoDrift: boolean;        // Default: false
    smoothing: number;         // Default: 0.1
    transitionDuration: number; // Default: 500
  };
  visualization: {
    cardSpacing: number;       // Default: 2
    cardScale: number;         // Default: 1
    timeScale: number;         // Default: 1
    maxVisibleCards: number;   // Default: 100
  };
  camera: {
    fov: number;              // Default: 75
    near: number;             // Default: 0.1
    far: number;              // Default: 1000
    position: Vector3;        // Default: [0, 5, 10]
    target: Vector3;          // Default: [0, 0, 0]
  };
  interaction: {
    dragThreshold: number;     // Default: 0.1
    zoomSpeed: number;        // Default: 1
    rotateSpeed: number;      // Default: 1
  };
}
```

### Configuration Context

Access and modify configuration:

```typescript
const { config, updateConfig } = useConfig();

// Update specific config value
updateConfig('animation.speed', 2.0);

// Update multiple values
updateConfig({
  'animation.speed': 2.0,
  'visualization.cardScale': 1.5
});
```

## Event System

### Timeline Events

```typescript
interface TimelineEvent {
  id: string;
  type: 'git' | 'custom';
  timestamp: Date;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

interface GitTimelineEvent extends TimelineEvent {
  type: 'git';
  commitHash: string;
  authorName: string;
  authorEmail: string;
  branch: string;
  files: Array<{
    path: string;
    changeType: 'added' | 'modified' | 'deleted';
  }>;
}
```

### Event Handlers

```typescript
// Card selection
onCardSelect: (id: string) => void;

// Card hover
onCardHover: (id: string | null) => void;

// Card position update
onCardPositionUpdate: (id: string, position: Vector3) => void;
```

## Animation System

### Animation Hooks

#### useTimelineAnimation

```typescript
interface TimelineAnimationOptions {
  enableAutoScroll: boolean;
  initialScrollSpeed: number;
}

const {
  isAutoScrolling,
  selectedCardId,
  cameraTarget,
  getCardAnimationProps,
  updateCardPosition,
  selectCard,
  setHoveredCard,
  toggleAutoScroll,
  setScrollSpeed,
} = useTimelineAnimation(options);
```

#### useCardAnimation

```typescript
interface CardAnimationProps {
  position: Vector3;
  rotation: Euler;
  scale: Vector3;
  opacity: number;
}

const animationProps = useCardAnimation(id, options);
```

## Data Integration

### Git Service

```typescript
class GitService {
  constructor(baseUrl: string);
  
  async fetchGitHistory(
    startDate?: Date,
    endDate?: Date
  ): Promise<GitTimelineEvent[]>;
  
  async getCommitDetails(
    commitHash: string
  ): Promise<GitTimelineEvent | null>;
}
```

### Timeline Data Hook

```typescript
interface TimelineDataResult {
  events: TimelineEvent[];
  isLoading: boolean;
  error: Error | null;
  period: {
    start: Date;
    end: Date;
  } | null;
}

const timelineData = useTimelineData(repoUrl);
```

## TypeScript Types

### Core Types

```typescript
// Vector types
type Vector2 = [number, number];
type Vector3 = [number, number, number];
type Euler = [number, number, number];

// Animation types
interface AnimationState {
  position: Vector3;
  rotation: Euler;
  scale: Vector3;
  opacity: number;
}

// Camera types
interface CameraState {
  position: Vector3;
  target: Vector3;
  zoom: number;
}
```

### Utility Types

```typescript
// Configuration type helpers
type ConfigPath = string;
type ConfigValue = any;
type ConfigUpdate = Record<ConfigPath, ConfigValue>;

// Event type helpers
type EventCallback<T = any> = (event: T) => void;
type EventUnsubscribe = () => void;

// Animation type helpers
type EasingFunction = (t: number) => number;
type AnimationCallback = (state: AnimationState) => void;
```

## Custom Hooks

### Logging Hook

```typescript
interface LoggerOptions {
  component: string;
  topic: string;
}

const logger = useLogger({
  component: 'TimelineVisualization',
  topic: 'animation'
});

logger.info('Animation started', { speed: 1.5 });
logger.error('Failed to load', { error: 'Network timeout' });
```

### Virtualization Hook

```typescript
interface VirtualizationOptions {
  itemSize: number;
  overscan: number;
  scrollOffset: number;
}

const visibleItems = useVirtualization(items, options);
```

## Error Handling

### Error Types

```typescript
class TimelineError extends Error {
  constructor(message: string, code: string);
}

class GitServiceError extends TimelineError {
  constructor(message: string, response?: Response);
}

class ConfigurationError extends TimelineError {
  constructor(message: string, key: string);
}
```

### Error Boundaries

```typescript
<TimelineErrorBoundary
  fallback={(error) => (
    <ErrorDisplay
      error={error}
      onRetry={() => window.location.reload()}
    />
  )}
>
  <TimelineVisualization />
</TimelineErrorBoundary>