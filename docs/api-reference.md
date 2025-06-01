# Timeline API Reference

## Redux Store API

### Store Configuration

```typescript
import { store, useAppDispatch, useAppSelector } from '../store';

// Typed hooks for Redux integration
const dispatch = useAppDispatch();
const state = useAppSelector(state => state);
```

### State Selectors

#### Timeline State
```typescript
const timelineState = useAppSelector(state => state.timeline);
const events = useAppSelector(state => state.timeline.events);
const loading = useAppSelector(state => state.timeline.loading);
const markerPosition = useAppSelector(state => state.timeline.markerPosition);
```

#### UI State
```typescript
const uiState = useAppSelector(state => state.ui);
const selectedCardId = useAppSelector(state => state.ui.selectedCardId);
const hoveredCardId = useAppSelector(state => state.ui.hoveredCardId);
const cameraState = useAppSelector(state => state.ui.cameraState);
const droneMode = useAppSelector(state => state.ui.droneMode);

// Occlusion system state
const markerFadeOpacity = useAppSelector(state => state.ui.markerFadeOpacity);
const debugMarkerFade = useAppSelector(state => state.ui.debugMarkerFade);
const fadedCardsTemporalRange = useAppSelector(state => state.ui.fadedCardsTemporalRange);
```

#### Repository State
```typescript
const repositoryState = useAppSelector(state => state.repository);
const repoUrl = useAppSelector(state => state.repository.url);
const isConnected = useAppSelector(state => state.repository.isConnected);
```

### Action Creators

#### Timeline Actions
```typescript
import {
  setLoading,
  setEvents,
  setMarkerPosition,
  resetTimeline
} from '../store/slices/timelineSlice';

dispatch(setLoading(true));
dispatch(setEvents(timelineEvents));
dispatch(setMarkerPosition(100));
dispatch(resetTimeline());
```

#### UI Actions
```typescript
import {
  setSelectedCardId,
  setHoveredCardId,
  updateCameraState,
  setDroneMode,
  setViewAll,
  setMarkerFadeOpacity,
  setDebugMarkerFade,
  setFadedCardsTemporalRange
} from '../store/slices/uiSlice';

dispatch(setSelectedCardId('card-123'));
dispatch(setHoveredCardId('card-456'));
dispatch(updateCameraState({ position: { x: 0, y: 10, z: 5 } }));
dispatch(setDroneMode(true));
dispatch(setViewAll(false));

// Occlusion system actions
dispatch(setMarkerFadeOpacity(0.15));
dispatch(setDebugMarkerFade(true));
dispatch(setFadedCardsTemporalRange({
  minTimestamp: 1640995200000,
  maxTimestamp: 1641081600000
}));
```

### Async Thunks (Intents)

#### Timeline Intents
```typescript
import {
  fetchTimelineData,
  purgeTimelineCache
} from '../store/intents/timelineIntents';

// Fetch timeline data
dispatch(fetchTimelineData({
  repoUrl: 'https://github.com/user/repo',
  sourceType: 'both',
  useMockData: false
}));

// Purge cache
dispatch(purgeTimelineCache({ repoUrl }));
```

#### UI Intents
```typescript
import {
  selectCard,
  hoverCard,
  updateTimelinePosition,
  toggleViewAll,
  toggleDroneMode
} from '../store/intents/uiIntents';

// Select a card
dispatch(selectCard({
  cardId: 'card-123',
  position: { x: 0, y: 0, z: 100 }
}));

// Hover a card (triggers occlusion system)
dispatch(hoverCard('card-456'));

// Update timeline position
dispatch(updateTimelinePosition({
  position: 150,
  updateCamera: true
}));

// Toggle view modes
dispatch(toggleViewAll());
dispatch(toggleDroneMode());
```

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
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  animationProps: {
    scale: number;
    rotation: readonly [number, number, number];
    positionY: number;
    springConfig: {
      mass: number;
      tension: number;
      friction: number;
    };
  };
  wiggle?: boolean;
  isMarkerDragging?: boolean;
  isTimelineHovering?: boolean;
  droneMode?: boolean;
  isHovered?: boolean;
  fadeOpacity?: number; // ⭐ Occlusion system
  debugMarker?: boolean; // ⭐ Debug visualization
}
```

### Occlusion System API

The timeline occlusion system provides enhanced visual clarity through intelligent fading.

#### **Core Occlusion Types**

```typescript
// Temporal range for marker fading
interface FadedCardsTemporalRange {
  minTimestamp: number;
  maxTimestamp: number;
}

// Occlusion configuration
interface OcclusionConfig {
  enableFrontCardFading: boolean;
  fadeStrategy: 'aggressive' | 'boundingBox';
  boundingBoxMargin: number;
  boundingBoxFadeOpacity: number;
  aggressiveFadeOpacity: number;
}
```

#### **Redux Occlusion State**

```typescript
// UI slice occlusion state
interface OcclusionState {
  markerFadeOpacity: number;
  debugMarkerFade: boolean;
  fadedCardsTemporalRange: FadedCardsTemporalRange | null;
}

// Redux selectors for occlusion
const markerFadeOpacity = useAppSelector(state => state.ui.markerFadeOpacity);
const debugMarkerFade = useAppSelector(state => state.ui.debugMarkerFade);
const fadedCardsTemporalRange = useAppSelector(state => state.ui.fadedCardsTemporalRange);
```

#### **Occlusion Actions**

```typescript
// Import occlusion actions
import {
  setMarkerFadeOpacity,
  setDebugMarkerFade,
  setFadedCardsTemporalRange
} from '../store/slices/uiSlice';

// Update marker fade opacity
dispatch(setMarkerFadeOpacity(0.15));

// Enable debug visualization
dispatch(setDebugMarkerFade(true));

// Set temporal range for marker fading
dispatch(setFadedCardsTemporalRange({
  minTimestamp: Date.now() - 86400000, // Yesterday
  maxTimestamp: Date.now() + 86400000  // Tomorrow
}));

// Clear occlusion state
dispatch(setMarkerFadeOpacity(1.0));
dispatch(setDebugMarkerFade(false));
dispatch(setFadedCardsTemporalRange(null));
```

#### **Occlusion Intent Integration**

```typescript
// Card hover with occlusion activation
import { hoverCard } from '../store/intents/uiIntents';

// Hover triggers occlusion calculations
dispatch(hoverCard('card-123')); // Activates occlusion system
dispatch(hoverCard(null));       // Deactivates occlusion system
```

#### **Marker Occlusion Implementation**

```typescript
// Timeline marker with occlusion support
const TimelineMarker: React.FC<MarkerProps> = ({ date, label }) => {
  // Get occlusion state from Redux
  const markerFadeOpacity = useAppSelector(state => state.ui.markerFadeOpacity);
  const fadedCardsTemporalRange = useAppSelector(state => state.ui.fadedCardsTemporalRange);
  const debugMarkerFade = useAppSelector(state => state.ui.debugMarkerFade);
  
  // Individual marker logic - check temporal range
  const markerTimestamp = new Date(date).getTime();
  const isMarkerInFadedRange = fadedCardsTemporalRange && 
    markerTimestamp >= fadedCardsTemporalRange.minTimestamp && 
    markerTimestamp <= fadedCardsTemporalRange.maxTimestamp;
  
  // Apply fade only if marker is in temporal range
  const actualOpacity = isMarkerInFadedRange ? markerFadeOpacity : 1.0;
  
  return (
    <group>
      {/* Marker with conditional fade */}
      <Line
        points={[[0, -1, 0], [0, 1, 0]]}
        color="#ff0000"
        transparent
        opacity={actualOpacity}
      />
      
      {/* Text with fillOpacity for proper Three.js transparency */}
      <SafeText
        fillOpacity={actualOpacity}
      >
        {label}
      </SafeText>
      
      {/* Debug visualization */}
      {isMarkerInFadedRange && debugMarkerFade && (
        <mesh>
          <boxGeometry args={[0.3, 1.5, 0.02]} />
          <meshBasicMaterial color="green" transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
};
```

#### **Text Transparency Pattern**

```typescript
// Correct way to handle text transparency in Three.js
<SafeText
  position={[0, 0, 0]}
  color="#000000"
  fontSize={0.3}
  fillOpacity={fadeOpacity} // ✅ Use fillOpacity property
>
  Text content
</SafeText>

// Incorrect - causes Three.js warnings
<SafeText
  color={`rgba(0,0,0,${fadeOpacity})`} // ❌ Don't use RGBA
>
  Text content
</SafeText>
```

## Redux State Types

### RootState

```typescript
interface RootState {
  timeline: TimelineState;
  ui: UIState;
  preferences: PreferencesState;
  repository: RepositoryState;
}
```

### TimelineState

```typescript
interface TimelineState {
  events: TimelineEvent[];
  loading: boolean;
  error: string | null;
  gitCount: number;
  specCount: number;
  currentPosition: number;
  markerPosition: number;
  sourceType: 'git' | 'spec' | 'both';
  isUsingMockData: boolean;
  lastFetchTime: number | null;
  cache: {
    [key: string]: {
      data: TimelineEvent[];
      timestamp: number;
    };
  };
}
```

### UIState

```typescript
interface UIState {
  // Animation settings
  animationSpeed: number;
  autoDrift: boolean;
  droneMode: boolean;
  isAutoScrolling: boolean;

  // View modes
  viewAll: boolean;
  focusCurrentMode: boolean;
  debugMode: boolean;
  cameraCyclingMode: boolean;

  // Camera state
  cameraState: CameraState;

  // Card states
  selectedCardId: string | null;
  hoveredCardId: string | null;

  // Occlusion system
  markerFadeOpacity: number;
  debugMarkerFade: boolean;
  fadedCardsTemporalRange: {
    minTimestamp: number;
    maxTimestamp: number;
  } | null;

  // Modal states
  showPreferences: boolean;
  showLoggingControl: boolean;

  // Layout states
  sidebarOpen: boolean;
  isInitializing: boolean;
}
```

### RepositoryState

```typescript
interface RepositoryState {
  url: string;
  username: string;
  isConnected: boolean;
  lastSyncTime: number | null;
  connectionError: string | null;
  isValidating: boolean;
  metadata: {
    branch: string;
    lastCommitHash: string;
    lastCommitTime: number | null;
  } | null;
}
```

### PreferencesState

```typescript
interface PreferencesState {
  repoUrl?: string;
  username?: string;
  animationSpeed?: number;
  autoDrift?: boolean;
  theme?: 'light' | 'dark' | 'system';
  cameraState?: StoredCameraState;
  markerPosition?: number;
  isLoaded: boolean;
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
