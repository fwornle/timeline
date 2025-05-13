# Development Guide

## Development Environment Setup

### Prerequisites

1. **Node.js and npm**
   - Node.js 18.0 or higher
   - npm 9.0 or higher

2. **IDE Setup**
   - VSCode recommended
   - Required extensions:
     - ESLint
     - Prettier
     - TypeScript and JavaScript Language Features
     - Three.js Editor Tools (optional)

### Initial Setup

1. Clone and install dependencies:
```bash
git clone [repository-url]
cd timeline
npm install
```

2. Setup development environment:
```bash
# Start development server
npm run dev

# In a separate terminal, run type checking
npm run type-check --watch
```

## Project Structure

```
timeline/
├── src/
│   ├── animation/         # Animation system
│   ├── components/        # React components
│   │   ├── layout/       # Layout components
│   │   └── three/        # Three.js components
│   ├── config/           # Configuration
│   ├── context/          # React contexts
│   ├── data/             # Data management
│   │   ├── hooks/       # Custom hooks
│   │   ├── services/    # API services
│   │   └── types/       # TypeScript types
│   └── utils/            # Utilities
│       └── logging/      # Logging system
├── public/               # Static assets
└── docs/                 # Documentation
```

## Development Workflow

### 1. Local Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Build for production
npm run build
```

### 2. Code Organization

- Follow feature-based organization within components
- Keep components focused and single-responsibility
- Use TypeScript for all new code
- Implement proper error boundaries
- Follow established naming conventions

### 3. Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: your feature description"

# Push changes
git push origin feature/your-feature
```

Follow conventional commits format:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Formatting changes
- refactor: Code refactoring
- test: Test updates
- chore: Build/dependency updates

## Testing Strategy

### 1. Unit Testing

```typescript
// Example component test
import { render, screen } from '@testing-library/react';
import { TimelineCard } from './TimelineCard';

describe('TimelineCard', () => {
  it('renders card with correct title', () => {
    render(<TimelineCard title="Test Commit" />);
    expect(screen.getByText('Test Commit')).toBeInTheDocument();
  });
});
```

### 2. Integration Testing

```typescript
// Example integration test
describe('Timeline Integration', () => {
  it('loads and displays git commits', async () => {
    render(<TimelineVisualization repoUrl="test-repo" />);
    await waitFor(() => {
      expect(screen.getByTestId('timeline-events')).toBeVisible();
    });
  });
});
```

### 3. Performance Testing

```typescript
// Example performance test
import { measureRenderTime } from '../utils/testing';

describe('Timeline Performance', () => {
  it('renders 1000 events within 500ms', async () => {
    const renderTime = await measureRenderTime(
      <TimelineVisualization events={generateEvents(1000)} />
    );
    expect(renderTime).toBeLessThan(500);
  });
});
```

## Common Issues and Solutions

### 1. Performance Issues

**Problem**: Slow rendering with many events

**Solution**:
```typescript
// Implement virtualization
import { useVirtualization } from '../hooks/useVirtualization';

function TimelineEvents({ events }) {
  const visibleEvents = useVirtualization(events, {
    itemHeight: 50,
    overscan: 5
  });
  
  return visibleEvents.map(event => (
    <TimelineCard key={event.id} {...event} />
  ));
}
```

### 2. Memory Leaks

**Problem**: Memory growth over time

**Solution**:
```typescript
// Proper cleanup in hooks
useEffect(() => {
  const subscription = subscribe();
  return () => {
    subscription.unsubscribe();
    // Clean up Three.js resources
    scene.dispose();
    geometry.dispose();
    material.dispose();
  };
}, []);
```

### 3. Type Errors

**Problem**: TypeScript errors with Three.js types

**Solution**:
```typescript
// Proper type definitions
import { Object3D, Vector3 } from 'three';

interface TimelineCardProps {
  position: Vector3;
  rotation: Euler;
  object: Object3D;
}
```

## Performance Optimization

### 1. Render Optimization

```typescript
// Memoize expensive components
const MemoizedCard = React.memo(TimelineCard, (prev, next) => {
  return (
    prev.position.equals(next.position) &&
    prev.selected === next.selected
  );
});
```

### 2. State Management

```typescript
// Use selective context updates
const [state, dispatch] = useReducer(reducer, initialState);
const value = useMemo(() => [state, dispatch], [state]);
```

### 3. Three.js Optimization

```typescript
// Implement object pooling
const objectPool = useMemo(() => {
  return new ObjectPool(TimelineCard, {
    initialSize: 100,
    maxSize: 1000
  });
}, []);
```

## Build Process

### 1. Development Build

```bash
# Start development server
npm run dev

# Environment variables
cp .env.example .env.local
```

### 2. Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### 3. Deployment

```bash
# Build and deploy
npm run build
npm run deploy
```

## Debugging Tips

1. Use React Developer Tools
2. Enable Three.js debug helpers
3. Use Performance profiler
4. Check browser console for warnings
5. Monitor memory usage
6. Use logging system effectively

## Contributing Guidelines

1. Fork the repository
2. Create feature branch
3. Follow code style guidelines
4. Write tests
5. Update documentation
6. Submit pull request

Remember to:
- Follow TypeScript best practices
- Write meaningful commit messages
- Update tests and documentation
- Consider performance implications