# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 CRITICAL: Knowledge Base Management Rule

**IMPORTANT: The shared-memory.json knowledge base must ALWAYS be updated using the `ukb` command. Never edit this file directly. The ukb tool ensures proper formatting, validation, and synchronization with MCP memory.**

## Commands for Development

### Build and Development
```bash
# Start development (both frontend and backend)
npm run dev

# Start backend only
npm run server

# Start frontend only  
npm start

# Build for production
npm run build

# Build backend
npm run build:server

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Testing and Quality
```bash
# Run linting
npm run lint

# Type checking
npx tsc --noEmit

# Check for TypeScript errors in all configs
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.server.json --noEmit
```

## Architecture Overview

This is a 3D timeline visualization application built with **MVI (Model-View-Intent)** architecture using **Redux Toolkit** for state management.

### Core Architecture Patterns

**MVI Pattern Implementation:**
- **Model**: Redux store with organized slices (timeline, ui, repository, preferences)
- **View**: Pure React components that render based on Redux state
- **Intent**: Async thunks and action creators in `src/store/intents/` that handle user interactions

**State Management:**
- Redux Toolkit with typed hooks (`useAppDispatch`, `useAppSelector`)
- State persistence via `src/services/storage.ts` for camera and marker positions
- Four main slices: timeline, ui, repository, preferences

### Key Directories

**State Management:**
- `src/store/slices/` - Redux slices with reducers and actions
- `src/store/intents/` - Async thunks for complex user interactions
- `src/store/hooks/` - Custom hooks for state management
- `src/services/storage.ts` - Persistent storage for user preferences

**3D Visualization:**
- `src/components/three/` - Three.js React components
- `src/animation/` - Animation system and timing
- `src/utils/three/` - 3D utilities and helpers

**Core Components:**
- `src/components/TimelineVisualization.tsx` - Main visualization orchestrator  
- `src/components/three/TimelineScene.tsx` - 3D scene container
- `src/components/three/TimelineCamera.tsx` - Camera control with multiple modes
- `src/components/three/TimelineEvents.tsx` - Event card container with position management

### Important Implementation Details

**Redux Store Configuration:**
- Serializable check disabled for Three.js Vector3 objects
- Typed hooks exported from `src/store/index.ts`
- State persistence integrated at slice level

**3D Component State Management:**
- Camera state synced between Redux and Three.js objects  
- Marker position persistence across app reloads
- Global card interaction system prevents conflicts

**Animation System:**
- Timeline marker and camera state automatically persist to localStorage
- Multiple camera modes: manual, view-all, focus, drone mode
- Exclusive card opening system with animation completion guarantees

**Data Flow:**
- User interactions → Intent functions → Redux state updates → Component re-renders
- Timeline data fetched from Node.js backend with file system caching
- Mock data fallback when repositories unavailable

### Backend (server.mjs)

**API Endpoints:**
- `GET /api/v1/git/history?repository=<url>` - Git commit history
- `GET /api/v1/specs/history?repository=<url>` - Specification history  
- `POST /api/v1/purge[/hard|/git|/spec]?repository=<url>` - Cache management

**Caching:**
- File system cache in `.timeline-cache/` directory
- Repository clones persisted locally
- Automatic mock data fallback

### Key Files to Understand

**State Management Entry Points:**
- `src/store/index.ts` - Store configuration and typed hooks
- `src/store/intents/uiIntents.ts` - User interaction handling
- `src/store/intents/timelineIntents.ts` - Data fetching logic

**Main Components:**
- `src/components/TimelineVisualization.tsx` - Connects Redux to 3D visualization
- `src/components/three/TimelineScene.tsx` - Three.js scene setup and coordination
- `src/components/three/TimelineCamera.tsx` - Complex camera state management

**Critical Systems:**
- `src/services/storage.ts` - Preference persistence (camera, marker position)
- `src/utils/three/cardUtils.ts` - Global 3D interaction coordination
- `src/utils/logging/` - Professional logging system with real-time control

### Development Patterns

**Adding New Features:**
1. Define intent functions in `src/store/intents/`
2. Add actions to appropriate slice in `src/store/slices/`
3. Connect components using typed hooks (`useAppDispatch`, `useAppSelector`)
4. Handle persistence in intent layer if needed

**State Updates:**
- Always use intent functions for complex operations
- Direct slice actions only for simple state changes
- Camera and marker positions automatically persist via intents

**3D Component Development:**
- Use refs for Three.js object references
- Coordinate state through Redux, not component props
- Handle animation completion in component cleanup

### Common Gotchas

**Three.js + Redux Integration:**
- Vector3 objects are not serializable - convert to plain objects for Redux
- Camera state must be synced between Three.js objects and Redux state
- Use `updateCameraWithSync` intent for camera changes to ensure persistence

**Animation System:**
- Cards have exclusive opening behavior - only one card open at a time
- Animation completion must be guaranteed to prevent stuck UI states
- Background click detection uses invisible mesh to catch clicks outside cards

**State Persistence:**
- Camera state and marker position automatically saved to localStorage
- Preferences slice auto-saves on every update
- Storage format is obfuscated but not encrypted

**Performance:**
- Three.js objects cannot be stored directly in Redux (serialization issues)
- Use `React.memo` strategically for 3D components
- Animation frame updates are throttled to prevent excessive Redux dispatches