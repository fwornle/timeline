# Timeline Visualization

A 3D timeline visualization application that transforms git repository history and specification files into an interactive 3D experience. Built with React, Three.js, TypeScript, and Node.js.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (frontend + backend)
npm run dev
```

Open http://localhost:3001 in your browser.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start frontend and backend servers |
| `npm run build` | Build the app for production |
| `npm run server` | Start backend only (port 3030) |
| `npm start` | Alias for `npm run dev` |
| `npm run lint` | Lint code |
| `npm run preview` | Preview production build |
| `npm test` | Run tests |

## Project Structure

```
timeline/
├── src/
│   ├── components/     # React components
│   │   ├── three/      # Three.js 3D components
│   │   ├── metrics/    # Metrics visualization
│   │   ├── layout/     # Layout components
│   │   └── ui/         # UI components
│   ├── store/          # Redux state management
│   ├── data/           # Services and data types
│   ├── utils/          # Utilities (logging, performance)
│   └── config/         # App configuration
├── docs/               # Documentation and diagrams
├── server.mjs          # Backend server
└── package.json
```

## Tech Stack

**Frontend:**
- React 19 + TypeScript
- Redux Toolkit (MVI architecture)
- Three.js + React Three Fiber
- Bootstrap 5

**Backend:**
- Node.js
- Git integration for repository parsing

## Features

- 3D timeline rendering of git commits and spec history
- Interactive camera controls and timeline navigation
- Real-time code metrics visualization
- State persistence across sessions
- Light/dark theme support

## Documentation

Detailed documentation available in `docs/`:

- [MVI Architecture](docs/mvi-architecture.md)
- [State Management](docs/state-management.md)
- [Development Guide](docs/development-guide.md)
- [API Reference](docs/api-reference.md)
