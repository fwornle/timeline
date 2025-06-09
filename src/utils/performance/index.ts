/**
 * Performance monitoring utilities
 */

export { reactProfiler, ReactProfilerComponent } from './ReactProfiler';
export { 
  usePerformanceProfiler, 
  useAnimationProfiler, 
  useThreeJsProfiler 
} from './usePerformanceProfiler';

// Performance monitoring configuration
export const performanceConfig = {
  // Enable profiling in development
  enabled: process.env.NODE_ENV === 'development',
  
  // Thresholds (in milliseconds)
  thresholds: {
    warning: 5,    // React's default warning threshold
    error: 16,     // One frame at 60fps
    animation: 16.67 // 60fps target
  },
  
  // Components to always profile
  criticalComponents: [
    'TimelineVisualization',
    'TimelineScene',
    'TimelineCard',
    'TimelineEvents',
    'TimelineCamera',
    'HorizontalMetricsPlot'
  ],
  
  // Auto-enable profiling for these operations
  autoProfile: {
    animations: true,
    threeJsOperations: true,
    dataProcessing: true,
    userInteractions: true
  }
};

/**
 * Initialize performance monitoring
 */
export function initializePerformanceMonitoring(): void {
  if (!performanceConfig.enabled) {
    return;
  }

  // Enable React profiler
  import('./ReactProfiler').then(({ reactProfiler }) => {
    reactProfiler.enable();
    reactProfiler.setThresholds(
      performanceConfig.thresholds.warning,
      performanceConfig.thresholds.error
    );
    
    console.log('🚀 Performance monitoring enabled');
    console.log('💡 Use window.perfDebug to control profiling:');
    console.log('   - window.perfDebug.report() - Show current performance report');
    console.log('   - window.perfDebug.clear() - Clear performance data');
    console.log('   - window.perfDebug.enable() - Enable profiling');
    console.log('   - window.perfDebug.disable() - Disable profiling');
    
    // Log performance report every 30 seconds in development
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        reactProfiler.logReport();
      }, 30000);
    }
  });

  // Add global performance monitoring
  if (typeof window !== 'undefined') {
    // Monitor long tasks
    if ('PerformanceLongTaskTiming' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          console.warn('🐌 Long task detected:', {
            name: entry.name,
            duration: entry.duration.toFixed(2) + 'ms',
            startTime: entry.startTime.toFixed(2) + 'ms'
          });
        });
      });

      try {
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('Long task observer not supported');
      }
    }

    // Monitor layout shifts
    if ('LayoutShift' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if ((entry as any).value > 0.1) { // CLS threshold
            console.warn('📐 Layout shift detected:', {
              value: (entry as any).value,
              startTime: entry.startTime.toFixed(2) + 'ms'
            });
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('Layout shift observer not supported');
      }
    }
  }
}

/**
 * Performance debugging utilities for console
 */
export const perfDebug = {
  async report() {
    const { reactProfiler } = await import('./ReactProfiler');
    reactProfiler.logReport();
  },
  
  async clear() {
    const { reactProfiler } = await import('./ReactProfiler');
    reactProfiler.clear();
  },
  
  async enable() {
    const { reactProfiler } = await import('./ReactProfiler');
    reactProfiler.enable();
  },
  
  async disable() {
    const { reactProfiler } = await import('./ReactProfiler');
    reactProfiler.disable();
  }
};

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).perfDebug = perfDebug;
}