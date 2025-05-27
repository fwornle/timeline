# Timeline Project Conversation

## Initial Context

**Working Directory:** `/Users/q284340/Agentic/timeline`
**Git Status:** On branch `main` with uncommitted changes to `.claude/settings.local.json` and `.roo/mcp.json`
**Project Type:** 3D timeline visualization application with MVI architecture using Redux Toolkit

## Architecture Overview

The project uses:
- **MVI (Model-View-Intent)** architecture pattern
- **Redux Toolkit** for state management
- **Three.js** for 3D visualization
- **React** for UI components
- **Node.js backend** with caching support

### Key Components:
- Timeline visualization with 3D cards
- Camera control system with multiple modes (manual, view-all, focus, drone)
- State persistence for camera and marker positions
- Git and specification history parsing
- Professional logging system with real-time control

## Development Commands

```bash
# Development
npm run dev        # Start both frontend and backend
npm run server     # Backend only
npm start          # Frontend only

# Build
npm run build      # Production build
npm run preview    # Preview production build

# Quality
npm run lint       # Run linting
npx tsc --noEmit   # Type checking
```

## API Endpoints

- `GET /api/v1/git/history?repository=<url>` - Git commit history
- `GET /api/v1/specs/history?repository=<url>` - Specification history
- `POST /api/v1/purge[/hard|/git|/spec]?repository=<url>` - Cache management

## User Request

The user opened the file `/Users/q284340/Agentic/timeline/.roo/mcp.json` in the IDE and requested to save this conversation to markdown.

## Action Taken

Created this markdown file to save the conversation context and project information.