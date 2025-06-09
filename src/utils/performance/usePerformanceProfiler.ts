/**
 * React hook for component performance profiling
 */

import { useEffect, useRef, useCallback } from 'react';
import { reactProfiler } from './ReactProfiler';
import { Logger } from '../logging/Logger';

interface UsePerformanceProfilerOptions {
  componentName: string;
  enabled?: boolean;
  threshold?: number; // ms - log if operation takes longer than this
  trackRenders?: boolean;
  trackEffects?: boolean;
}

export function usePerformanceProfiler({
  componentName,
  enabled = true,
  threshold = 5,
  trackRenders = true,
  trackEffects = true
}: UsePerformanceProfilerOptions) {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(0);
  const mountTimeRef = useRef(0);

  // Track mount time
  useEffect(() => {
    if (!enabled) return;
    
    mountTimeRef.current = performance.now();
    
    return () => {
      if (trackEffects) {
        const unmountTime = performance.now();
        const totalLifeTime = unmountTime - mountTimeRef.current;
        
        if (totalLifeTime > threshold) {
          Logger.info('PERFORMANCE', `Component ${componentName} total lifetime`, {
            duration: totalLifeTime.toFixed(2) + 'ms',
            renders: renderCountRef.current
          });
        }
      }
    };
  }, [componentName, enabled, threshold, trackEffects]);

  // Track render performance
  useEffect(() => {
    if (!enabled || !trackRenders) return;
    
    const currentTime = performance.now();
    renderCountRef.current += 1;
    
    if (lastRenderTimeRef.current > 0) {
      const timeSinceLastRender = currentTime - lastRenderTimeRef.current;
      
      if (timeSinceLastRender > threshold && renderCountRef.current > 1) {
        Logger.warn('PERFORMANCE', `Slow render in ${componentName}`, {
          renderNumber: renderCountRef.current,
          timeSinceLastRender: timeSinceLastRender.toFixed(2) + 'ms',
          threshold: threshold + 'ms'
        });
      }
    }
    
    lastRenderTimeRef.current = currentTime;
  });

  // Profiling wrapper for functions
  const profileFunction = useCallback(<T>(
    name: string,
    fn: () => T,
    options: { logResult?: boolean; logIfSlow?: boolean } = {}
  ): T => {
    if (!enabled) {
      return fn();
    }

    return reactProfiler.profile(`${componentName}.${name}`, fn, componentName);
  }, [componentName, enabled]);

  // Profiling wrapper for async functions
  const profileAsyncFunction = useCallback(async <T>(
    name: string,
    fn: () => Promise<T>,
    options: { logResult?: boolean; logIfSlow?: boolean } = {}
  ): Promise<T> => {
    if (!enabled) {
      return fn();
    }

    return reactProfiler.profileAsync(`${componentName}.${name}`, fn, componentName);
  }, [componentName, enabled]);

  // Track expensive operations
  const trackExpensiveOperation = useCallback(<T>(
    operationName: string,
    operation: () => T
  ): T => {
    if (!enabled) {
      return operation();
    }

    const startTime = performance.now();
    const result = operation();
    const duration = performance.now() - startTime;

    if (duration > threshold) {
      Logger.warn('PERFORMANCE', `Expensive operation in ${componentName}`, {
        operation: operationName,
        duration: duration.toFixed(2) + 'ms',
        threshold: threshold + 'ms'
      });
    }

    return result;
  }, [componentName, enabled, threshold]);

  // Get component stats
  const getStats = useCallback(() => {
    return {
      componentName,
      renderCount: renderCountRef.current,
      mountTime: mountTimeRef.current,
      currentTime: performance.now(),
      lifetime: performance.now() - mountTimeRef.current
    };
  }, [componentName]);

  return {
    profileFunction,
    profileAsyncFunction,
    trackExpensiveOperation,
    getStats,
    renderCount: renderCountRef.current
  };
}

/**
 * Hook for tracking animation frame performance
 */
export function useAnimationProfiler(componentName: string, enabled: boolean = true) {
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const slowFramesRef = useRef(0);

  const trackFrame = useCallback((callback?: () => void) => {
    if (!enabled) {
      callback?.();
      return;
    }

    const frameStart = performance.now();
    frameCountRef.current += 1;

    if (callback) {
      callback();
    }

    const frameEnd = performance.now();
    const frameDuration = frameEnd - frameStart;

    // Track slow frames (>16.67ms = below 60fps)
    if (frameDuration > 16.67) {
      slowFramesRef.current += 1;
      
      Logger.warn('PERFORMANCE', `Slow animation frame in ${componentName}`, {
        frameNumber: frameCountRef.current,
        duration: frameDuration.toFixed(2) + 'ms',
        targetFPS: '60fps (16.67ms)',
        actualFPS: (1000 / frameDuration).toFixed(1) + 'fps'
      });
    }

    lastFrameTimeRef.current = frameEnd;
  }, [componentName, enabled]);

  const getFrameStats = useCallback(() => {
    return {
      totalFrames: frameCountRef.current,
      slowFrames: slowFramesRef.current,
      slowFramePercentage: frameCountRef.current > 0 
        ? ((slowFramesRef.current / frameCountRef.current) * 100).toFixed(2) + '%'
        : '0%'
    };
  }, []);

  return {
    trackFrame,
    getFrameStats
  };
}

/**
 * Hook for profiling Three.js operations
 */
export function useThreeJsProfiler(componentName: string, enabled: boolean = true) {
  const profileRender = useCallback((renderFn: () => void) => {
    if (!enabled) {
      renderFn();
      return;
    }

    reactProfiler.profile(`${componentName}.three.render`, renderFn, componentName);
  }, [componentName, enabled]);

  const profileAnimation = useCallback((animationFn: () => void) => {
    if (!enabled) {
      animationFn();
      return;
    }

    reactProfiler.profile(`${componentName}.three.animation`, animationFn, componentName);
  }, [componentName, enabled]);

  const profileGeometry = useCallback(<T>(geometryFn: () => T): T => {
    if (!enabled) {
      return geometryFn();
    }

    return reactProfiler.profile(`${componentName}.three.geometry`, geometryFn, componentName);
  }, [componentName, enabled]);

  return {
    profileRender,
    profileAnimation,
    profileGeometry
  };
}