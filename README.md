# Timeline Visualization

A sophisticated 3D timeline visualization application that transforms git repository history and specification files into an interactive, immersive 3D experience. Built with React, Three.js, TypeScript, and a Node.js backend, it provides real-time visualization of development workflows with advanced animation and interaction capabilities.

## ✨ Features

### 🎯 Core Visualization
- **3D Timeline Rendering**: Interactive 3D visualization of git commits and spec history
- **Dual Data Sources**: Displays both git commit history and specification/story timeline
- **Real-time Data**: Fetches live data from repositories with intelligent caching
- **Mock Data Fallback**: Seamless fallback to mock data when repositories unavailable

### 🎮 Interactive Controls
- **Timeline Navigation**: Click-to-move timeline marker with smooth animations
- **Card Interactions**: Hover and click timeline cards for detailed information
- **Camera Controls**: Multiple camera modes (manual, view-all, focus, drone mode)
- **Auto-drift Mode**: Automated timeline playback with adjustable speed

### 🎨 Advanced Animations
- **Smooth Transitions**: Fluid camera movements and card animations
- **Exclusive Card Opening**: Only one card open at a time with guaranteed animation completion
- **Global State Management**: Sophisticated interaction handling prevents stuck UI states
- **Performance Optimized**: 60fps animations with efficient rendering

### 🛠️ Developer Features
- **Professional Logging**: Category-based logging system with real-time control
- **Debug Mode**: Comprehensive debugging tools and performance monitoring
- **Hot Module Replacement**: Instant development feedback with Vite
- **TypeScript**: Full type safety throughout the application

### 🎨 User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Theme Support**: Light, dark, and system theme options
- **Persistent Settings**: User preferences saved across sessions
- **Professional UI**: Modern Bootstrap-based interface with custom styling

## 🏗️ Architecture

### MVI (Model-View-Intent) Pattern
The application follows the **MVI architectural pattern** with **Redux Toolkit** for predictable state management:

- **Model**: Redux store with organized state slices (timeline, ui, repository, preferences)
- **View**: Pure React components that render based on state
- **Intent**: Action creators and async thunks that handle user interactions and side effects

### Frontend Stack
- **React 19** + **TypeScript** for type-safe component development
- **Redux Toolkit** for centralized state management with MVI pattern
- **Three.js** + **React Three Fiber** for 3D rendering and interactions
- **Vite** for fast development and optimized builds
- **Bootstrap 5** for responsive UI components

### Backend Stack
- **Node.js** + **Express** for REST API and git processing
- **File System Caching** for persistent data storage
- **Git Integration** for repository cloning and parsing
- **Mock Data Generation** for development and fallback scenarios

### Key Technologies
- **Redux Toolkit**: Modern Redux with excellent TypeScript support
- **React Three Fiber**: Declarative 3D programming with React patterns
- **MVI Pattern**: Unidirectional data flow with clear separation of concerns
- **CSS Variables**: Dynamic theming and consistent styling
- **Typed Hooks**: Full TypeScript integration for state management

## 📋 Requirements

- **Node.js 18.0+** (for backend and build tools)
- **Git** (for repository integration and cloning)
- **Modern Browser** with WebGL support (Chrome, Firefox, Safari, Edge)
- **4GB RAM** minimum (8GB recommended for large repositories)

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone [repository-url]
cd timeline

# Install dependencies
npm install
```

### 2. Development

```bash
# Start both frontend and backend servers
npm run dev

# Alternative: Start individually
npm run server  # Backend only (port 3030)
npm run start   # Frontend only (port 3001)
```

### 3. Access Application

Open your browser and navigate to `http://localhost:3001`

The application automatically starts both React frontend and Node.js backend servers.

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

## 📚 Documentation

### **Architecture & Design**

- **[Architecture Overview](docs/architecture.md)**: Complete system architecture and design decisions
- **[MVI Architecture](docs/mvi-architecture.md)**: Model-View-Intent pattern implementation with Redux
- **[State Management](docs/state-management.md)**: Redux Toolkit guide with async thunks and best practices

### **Development Resources**

- **[Development Guide](docs/development-guide.md)**: Setup, workflows, and MVI development patterns
- **[API Reference](docs/api-reference.md)**: Redux store APIs, backend endpoints, and component interfaces
- **[Product Requirements](docs/product-requirements.md)**: Original product specifications and features

### **Visual Documentation**

All architecture diagrams are available as PNG files in `docs/images/`:

- **Core Architecture**: System overview and technology stack
- **MVI Architecture**: Model-View-Intent pattern visualization
- **Redux Store Structure**: State management organization
- **Component Integration**: How React components connect to Redux
- **State Flow Diagram**: Data flow in MVI architecture
- **Sequence Diagrams**: Detailed interaction flows

### **Quick References**

- **Component Structure**: See `src/components/` for React components
- **Redux Store**: See `src/store/` for state management (slices, intents, types)
- **Type Definitions**: See `src/data/types/` for TypeScript interfaces
- **Configuration**: See `src/config/` for app configuration
- **Logging System**: See `src/utils/logging/` for debug tools

> **Note**: All PlantUML source files are available in `docs/puml/` for easy modification and regeneration of diagrams.

## 🤝 Contributing

We welcome contributions! Please see our [Development Guide](docs/development-guide.md) for:
- Development environment setup
- Code style guidelines
- Testing procedures
- Pull request process

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For help and support:
1. Check the [comprehensive documentation](docs/)
2. Review [common troubleshooting issues](docs/development-guide.md#troubleshooting)
3. Create an issue in the repository
4. Use the built-in logging system for debugging
