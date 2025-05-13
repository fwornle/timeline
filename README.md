# Timeline Visualization

An interactive 3D timeline visualization tool built with React, Three.js, and TypeScript. Visualize git commit history with features like auto-scrolling, animation controls, and interactive 3D elements.

## Features

- 3D visualization of git commit history
- Interactive timeline navigation
- Automatic scrolling with adjustable speed
- Commit details on hover
- Responsive 3D rendering
- TypeScript support
- Performance optimized

## Requirements

- Node.js 18.0 or higher
- Git (for repository integration)
- Modern web browser with WebGL support

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd timeline
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173` by default.

## Usage Guide

### Basic Usage

1. Enter a Git repository URL in the top bar
2. Adjust animation speed using the speed control
3. Toggle auto-drift for automatic timeline scrolling
4. Click on timeline events to view details
5. Use mouse/touch controls to navigate the 3D space:
   - Pan: Left mouse drag / One finger drag
   - Zoom: Mouse wheel / Pinch gesture
   - Rotate: Right mouse drag / Two finger drag

### Configuration

Key configuration options can be customized in `src/config/defaultConfig.ts`:

```typescript
{
  animation: {
    speed: 1,
    autoDrift: false
  },
  visualization: {
    cardSpacing: 2,
    timeScale: 1
  }
}
```

For detailed configuration options, see [Configuration Guide](docs/api.md#configuration).

## Development Setup

1. Install additional development dependencies:
```bash
npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

2. Configure ESLint with type checking:
```js
export default tseslint.config({
  extends: [
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

3. Optional: Add React-specific lint rules:
```js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

## Browser Compatibility

| Browser           | Minimum Version | Notes                                |
|------------------|----------------|--------------------------------------|
| Chrome           | 91+            | Full support                         |
| Firefox          | 90+            | Full support                         |
| Safari           | 15+            | Full support                         |
| Edge             | 91+            | Full support                         |
| Chrome Mobile    | 91+            | Touch controls supported             |
| Safari iOS      | 15+            | Touch controls supported             |

WebGL 2.0 support is required for 3D visualization.

## Performance Considerations

- Large repositories may take longer to load initially
- Enable hardware acceleration in your browser for best performance
- Adjust animation speed and auto-drift settings based on device capabilities
- Consider using the built-in performance profiling tools for optimization

## Troubleshooting

Common issues and solutions:

1. **White screen / No visualization**
   - Check if WebGL is enabled in your browser
   - Verify hardware acceleration is enabled
   - Clear browser cache and reload

2. **Slow performance**
   - Reduce animation speed
   - Disable auto-drift for low-end devices
   - Close other resource-intensive browser tabs

3. **Repository loading fails**
   - Verify repository URL is correct and accessible
   - Check network connection
   - Ensure repository is public or credentials are provided

For more detailed documentation, see:
- [Architecture Overview](docs/architecture.md)
- [Development Guide](docs/development.md)
- [API Reference](docs/api.md)
