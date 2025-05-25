# Timeline API Reference

## Backend API Endpoints

### Base URL
```
http://localhost:3030/api/v1
```

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 12345.67,
    "env": "development"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Git History
```http
GET /git/history?repository={url}
```

**Parameters:**
- `repository` (required): Git repository URL

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "type": "git",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "title": "Add new feature",
      "authorName": "John Doe",
      "authorEmail": "john@example.com",
      "branch": "main",
      "commitHash": "abc123def456",
      "files": [
        {
          "path": "src/component.ts",
          "type": "modified"
        }
      ],
      "stats": {
        "filesAdded": 1,
        "filesModified": 2,
        "filesDeleted": 0,
        "linesAdded": 45,
        "linesDeleted": 12,
        "linesDelta": 33
      }
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z",
  "mocked": false
}
```

### Specification History
```http
GET /specs/history?repository={url}
```

**Parameters:**
- `repository` (required): Git repository URL

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "spec-001",
      "type": "spec",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "title": "User Authentication Spec",
      "specType": "Feature",
      "status": "Completed",
      "version": "1.0.0",
      "stats": {
        "promptCount": 5,
        "filesCreated": 3,
        "filesModified": 2,
        "linesAdded": 120,
        "linesDeleted": 15,
        "toolInvocations": 8
      }
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z",
  "mocked": false
}
```

### Cache Management

#### Soft Purge (Cache Files Only)
```http
POST /purge?repository={url}
```

#### Hard Purge (Cache + Repository Clone)
```http
POST /purge/hard?repository={url}
```

#### Purge Specific Cache Type
```http
POST /purge/git?repository={url}
POST /purge/spec?repository={url}
```

**Response:**
```json
{
  "success": true,
  "message": "Cache purged successfully",
  "purged": true
}
```

## Frontend Component APIs

### TimelineVisualization

Main visualization orchestrator component.

```typescript
interface TimelineVisualizationProps {
  repoUrl: string;
  animationSpeed: number;
  autoDrift: boolean;
  droneMode?: boolean;
  onLoadingChange: (isLoading: boolean) => void;
  onError: (error: Error | null) => void;
  onDataLoaded?: (
    gitEvents: TimelineEvent[],
    specEvents: TimelineEvent[],
    isGitHistoryMocked: boolean,
    isSpecHistoryMocked: boolean
  ) => void;
  onPositionUpdate?: (position: number) => void;
  onCameraPositionChange?: (position: Vector3) => void;
  onCameraStateChange?: (state: CameraState) => void;
  initialCameraState?: CameraState;
  initialMarkerPosition?: number;
  forceReload?: boolean;
  viewAllMode?: boolean;
  focusCurrentMode?: boolean;
  debugMode?: boolean;
}
```

**Usage:**
```typescript
<TimelineVisualization
  repoUrl="https://github.com/user/repo"
  animationSpeed={1.5}
  autoDrift={true}
  droneMode={false}
  onLoadingChange={setIsLoading}
  onError={setError}
  onDataLoaded={(git, spec, gitMocked, specMocked) => {
    setGitCount(git.length);
    setSpecCount(spec.length);
    setIsGitMocked(gitMocked);
    setIsSpecMocked(specMocked);
  }}
  debugMode={false}
/>
```

### TimelineScene

3D scene container and interaction manager.

```typescript
interface TimelineSceneProps {
  events: TimelineEvent[];
  selectedCardId: string | null;
  cameraTarget: Vector3;
  onCardSelect: (id: string | null) => void;
  onCardHover: (id: string | null) => void;
  onCardPositionUpdate: (id: string, position: Vector3) => void;
  getCardAnimationProps: (id: string) => CardAnimationProps;
  viewAllMode?: boolean;
  focusCurrentMode?: boolean;
  droneMode?: boolean;
  currentPosition?: number;
  onMarkerPositionChange?: (position: number) => void;
  onCameraPositionChange?: (position: Vector3) => void;
  onCameraStateChange?: (state: CameraState) => void;
  initialCameraState?: CameraState;
  debugMode?: boolean;
  disableCameraControls?: boolean;
}
```

### TimelineCamera

Camera control and positioning system.

```typescript
interface TimelineCameraProps {
  target: Vector3;
  viewAllMode?: boolean;
  focusCurrentMode?: boolean;
  droneMode?: boolean;
  events: TimelineEvent[];
  debugMode?: boolean;
  onCameraPositionChange?: (position: Vector3) => void;
  onCameraStateChange?: (state: CameraState) => void;
  initialCameraState?: CameraState;
  disableControls?: boolean;
}
```

### TimelineCard

Individual timeline event card component.

```typescript
interface TimelineCardProps {
  event: TimelineEvent;
  position: [number, number, number];
  isSelected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onPositionUpdate: (id: string, position: Vector3) => void;
  getAnimationProps: (id: string) => CardAnimationProps;
  isMarkerDragging?: boolean;
  isTimelineHovering?: boolean;
  droneMode?: boolean;
}
```

## Data Types

### TimelineEvent

```typescript
interface TimelineEvent {
  id: string;
  type: 'git' | 'spec';
  timestamp: string;
  title: string;
  authorName?: string;
  authorEmail?: string;
  branch?: string;
  commitHash?: string;
  specType?: string;
  status?: string;
  version?: string;
  files?: FileChange[];
  stats: EventStats;
}
```

### EventStats

```typescript
interface EventStats {
  filesAdded?: number;
  filesModified?: number;
  filesDeleted?: number;
  linesAdded?: number;
  linesDeleted?: number;
  linesDelta?: number;
  promptCount?: number;
  filesCreated?: number;
  toolInvocations?: number;
}
```

### CameraState

```typescript
interface CameraState {
  position: Vector3;
  target: Vector3;
  zoom: number;
}
```

### CardAnimationProps

```typescript
interface CardAnimationProps {
  position: Vector3;
  rotation: Euler;
  scale: Vector3;
  opacity: number;
}
```

## Custom Hooks

### useTimelineData

```typescript
interface UseTimelineDataResult {
  events: TimelineEvent[];
  period: TimelinePeriod | null;
  isLoading: boolean;
  hasError: boolean;
  errors: {
    git: Error | null;
    spec: Error | null;
  };
  sources: {
    git: DataSourceState;
    spec: DataSourceState;
  };
  filter: TimelineFilter;
  updateFilter: (filter: Partial<TimelineFilter>) => void;
  refresh: (force?: boolean) => Promise<void>;
  purgeAndRefresh: () => Promise<void>;
  hardPurgeAndRefresh: () => Promise<void>;
  isGitHistoryMocked: boolean;
  isSpecHistoryMocked: boolean;
  usingMockedData: boolean;
  hardReload: () => Promise<void>;
}

const timelineData = useTimelineData(repoUrl);
```

### useTimelineAnimation

```typescript
interface UseTimelineAnimationResult {
  isAutoScrolling: boolean;
  selectedCardId: string | null;
  cameraTarget: Vector3;
  cardPositionsRef: React.MutableRefObject<Map<string, Vector3>>;
  getCardAnimationProps: (id: string) => CardAnimationProps;
  updateCardPosition: (id: string, position: Vector3) => void;
  selectCard: (id: string | null) => void;
  setHoveredCard: (id: string | null) => void;
  toggleAutoScroll: () => void;
  setScrollSpeed: (speed: number) => void;
  setCameraTargetZ: (z: number) => void;
  setCameraTarget: (target: Vector3) => void;
}

const animation = useTimelineAnimation(options);
```

### useLogger

```typescript
interface UseLoggerOptions {
  component: string;
  topic: string;
}

interface LoggerInstance {
  trace: (message: string, data?: any) => void;
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, data?: any) => void;
}

const logger = useLogger({ component: 'MyComponent', topic: 'ui' });
```

## Configuration System

### Color Configuration

```typescript
interface ColorConfig {
  primary: ColorPalette;
  accent: ColorPalette;
  surface: ColorPalette;
  text: ColorPalette;
  border: ColorPalette;
  success: ColorPalette;
  warning: ColorPalette;
  error: ColorPalette;
  cards: CardColors;
  visualization: VisualizationColors;
  ui: UIColors;
}
```

### Animation Configuration

```typescript
interface AnimationConfig {
  durations: {
    fast: number;
    normal: number;
    slow: number;
    card: number;
    camera: number;
  };
  easing: {
    default: string;
    smooth: string;
    bounce: string;
  };
  performance: {
    targetFPS: number;
    maxDelta: number;
    enableVSync: boolean;
  };
}
```

### Dimension Configuration

```typescript
interface DimensionConfig {
  card: {
    width: number;
    height: number;
    depth: number;
    spacing: number;
  };
  timeline: {
    length: number;
    height: number;
    markerHeight: number;
  };
  camera: {
    defaultDistance: number;
    minDistance: number;
    maxDistance: number;
    fov: number;
  };
}
```
