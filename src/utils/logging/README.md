# Enhanced Logging System

This directory contains an enhanced logging system for the Timeline application, inspired by the BMW Dynamic Architecture project's logging implementation.

## Features

- **Categorized Logging**: Organize logs by functional areas (UI, DATA, API, etc.)
- **Colored Console Output**: Visual distinction between log levels and categories
- **Configurable Verbosity**: Enable/disable specific log levels and categories
- **Persistent Settings**: Log preferences saved to localStorage
- **UI Controls**: Interactive logging configuration panel
- **Backward Compatibility**: Works with existing logger usage

## Quick Start

### Basic Usage

```typescript
import { Logger } from './utils/logging/Logger';

// Simple logging with categories
Logger.info(Logger.Categories.UI, 'User clicked button');
Logger.error(Logger.Categories.API, 'Failed to fetch data', { url: '/api/data' });
Logger.debug(Logger.Categories.THREE, 'Camera position updated', { x: 10, y: 20, z: 30 });

// All log levels
Logger.trace(Logger.Categories.PERFORMANCE, 'Function entry');
Logger.debug(Logger.Categories.DATA, 'Processing data');
Logger.info(Logger.Categories.LIFECYCLE, 'Component mounted');
Logger.warn(Logger.Categories.CACHE, 'Cache miss');
Logger.error(Logger.Categories.SERVER, 'Connection failed');
```

### Available Categories

- `LIFECYCLE` - App/component lifecycle events
- `UI` - User interface interactions
- `DATA` - Data processing and management
- `API` - API calls and responses
- `CACHE` - Caching operations
- `GIT` - Git repository operations
- `SPEC` - Specification processing
- `THREE` - Three.js operations
- `ANIMATION` - Animation system
- `CAMERA` - Camera controls
- `TIMELINE` - Timeline operations
- `CARDS` - Card interactions
- `EVENTS` - Event handling
- `PERFORMANCE` - Performance monitoring
- `SERVER` - Server operations
- `AUTH` - Authentication

### Configuration

Access the logging configuration through the UI:
1. Click the document icon in the top navigation bar
2. Enable/disable log levels (ERROR, WARN, INFO, DEBUG, TRACE)
3. Enable/disable categories
4. Settings are automatically saved to localStorage

### Programmatic Configuration

```typescript
// Enable specific levels
Logger.setActiveLevels([Logger.Levels.ERROR, Logger.Levels.WARN, Logger.Levels.INFO]);

// Enable specific categories
Logger.setActiveCategories([Logger.Categories.UI, Logger.Categories.API]);

// Enable/disable individual categories
Logger.enableCategory(Logger.Categories.DEBUG);
Logger.disableCategory(Logger.Categories.TRACE);

// Get current settings
const activeLevels = Logger.getActiveLevels();
const activeCategories = Logger.getActiveCategories();
```

### Console Testing

The Logger is available globally in the browser console:

```javascript
// Test different log levels
Logger.info(Logger.Categories.UI, 'Test info message');
Logger.warn(Logger.Categories.API, 'Test warning');
Logger.error(Logger.Categories.DATA, 'Test error');

// View available categories and levels
console.log(Logger.Categories);
console.log(Logger.Levels);

// Configure logging
Logger.setActiveLevels([Logger.Levels.ERROR, Logger.Levels.WARN]);
Logger.enableCategory(Logger.Categories.PERFORMANCE);
```

## Backward Compatibility

The system maintains compatibility with the existing logger:

```typescript
import { logger } from './utils/logging/Logger';

// Old style still works
logger.info('component', 'Message');
logger.error('api', 'Error message', { data: 'value' });
```

## File Structure

```
src/utils/logging/
├── README.md                    # This documentation
├── Logger.ts                    # Main Logger class
├── config/
│   ├── loggingConfig.ts        # Log levels and categories
│   └── loggingColors.ts        # Color configuration
└── hooks/
    └── useLogger.ts            # React hook for logging
```

## Color Coding

- **ERROR**: Red background, white text
- **WARN**: Orange background, black text
- **INFO**: Category color, auto-contrast text
- **DEBUG**: Lightened category color
- **TRACE**: Very light category color

Each category has its own distinct color for easy visual identification.

## Performance

- Logs are filtered before processing, so disabled categories have minimal performance impact
- Color calculations are optimized for readability
- Settings are cached in memory after loading from localStorage

## Best Practices

1. **Use appropriate categories**: Choose the most specific category for your log
2. **Include context**: Add relevant data objects to help with debugging
3. **Use appropriate levels**: 
   - TRACE: Very detailed debugging
   - DEBUG: General debugging information
   - INFO: Important application events
   - WARN: Potential issues
   - ERROR: Actual errors
4. **Configure for environment**: Enable more verbose logging in development
5. **Performance-sensitive code**: Check if logging is enabled before expensive operations

```typescript
// For expensive logging operations
if (Logger.getActiveCategories().has(Logger.Categories.PERFORMANCE)) {
  const expensiveData = calculateComplexMetrics();
  Logger.debug(Logger.Categories.PERFORMANCE, 'Metrics calculated', expensiveData);
}
```
