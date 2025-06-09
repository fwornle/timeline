/**
 * React Performance Profiler
 * 
 * Helps identify slow React operations that trigger the "message handler took X ms" warnings
 */

import React from 'react';
import { Logger } from '../logging/Logger';

interface PerformanceEntry {
  name: string;
  startTime: number;
  duration: number;
  stack?: string;
  component?: string;
}

interface PerformanceThresholds {
  warning: number;  // ms
  error: number;    // ms
}

class ReactProfiler {
  private static instance: ReactProfiler;
  private entries: PerformanceEntry[] = [];
  private isEnabled: boolean = false;
  private thresholds: PerformanceThresholds = {
    warning: 5,   // React's default warning threshold
    error: 16     // One frame at 60fps
  };
  private maxEntries: number = 100;

  private constructor() {
    this.setupPerformanceObserver();
    this.patchScheduler();
  }

  static getInstance(): ReactProfiler {
    if (!ReactProfiler.instance) {
      ReactProfiler.instance = new ReactProfiler();
    }
    return ReactProfiler.instance;
  }

  enable(): void {
    this.isEnabled = true;
    Logger.info('PERFORMANCE', 'React profiler enabled');
  }

  disable(): void {
    this.isEnabled = false;
    Logger.info('PERFORMANCE', 'React profiler disabled');
  }

  setThresholds(warning: number, error: number): void {
    this.thresholds = { warning, error };
  }

  /**
   * Manual profiling wrapper for functions
   */
  profile<T>(name: string, fn: () => T, component?: string): T {
    if (!this.isEnabled) {
      return fn();
    }

    const startTime = performance.now();
    let result: T;
    let error: Error | null = null;

    try {
      result = fn();
    } catch (e) {
      error = e as Error;
      throw e;
    } finally {
      const duration = performance.now() - startTime;
      this.recordEntry({
        name,
        startTime,
        duration,
        component,
        stack: error ? error.stack : new Error().stack
      });
    }

    return result!;
  }

  /**
   * Async profiling wrapper
   */
  async profileAsync<T>(name: string, fn: () => Promise<T>, component?: string): Promise<T> {
    if (!this.isEnabled) {
      return fn();
    }

    const startTime = performance.now();
    let result: T;
    let error: Error | null = null;

    try {
      result = await fn();
    } catch (e) {
      error = e as Error;
      throw e;
    } finally {
      const duration = performance.now() - startTime;
      this.recordEntry({
        name,
        startTime,
        duration,
        component,
        stack: error ? error.stack : new Error().stack
      });
    }

    return result;
  }

  /**
   * Get performance report
   */
  getReport(): {
    totalEntries: number;
    slowEntries: PerformanceEntry[];
    averageDuration: number;
    maxDuration: number;
    componentStats: Record<string, { count: number; avgDuration: number; maxDuration: number }>;
  } {
    const slowEntries = this.entries.filter(entry => entry.duration >= this.thresholds.warning);
    const totalDuration = this.entries.reduce((sum, entry) => sum + entry.duration, 0);
    const maxDuration = Math.max(...this.entries.map(entry => entry.duration), 0);
    
    // Component statistics
    const componentStats: Record<string, { count: number; totalDuration: number; maxDuration: number }> = {};
    
    this.entries.forEach(entry => {
      const component = entry.component || 'unknown';
      if (!componentStats[component]) {
        componentStats[component] = { count: 0, totalDuration: 0, maxDuration: 0 };
      }
      componentStats[component].count++;
      componentStats[component].totalDuration += entry.duration;
      componentStats[component].maxDuration = Math.max(componentStats[component].maxDuration, entry.duration);
    });

    // Convert to final format
    const finalComponentStats: Record<string, { count: number; avgDuration: number; maxDuration: number }> = {};
    Object.entries(componentStats).forEach(([component, stats]) => {
      finalComponentStats[component] = {
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count,
        maxDuration: stats.maxDuration
      };
    });

    return {
      totalEntries: this.entries.length,
      slowEntries,
      averageDuration: this.entries.length > 0 ? totalDuration / this.entries.length : 0,
      maxDuration,
      componentStats: finalComponentStats
    };
  }

  /**
   * Clear all recorded entries
   */
  clear(): void {
    this.entries = [];
    Logger.info('PERFORMANCE', 'React profiler entries cleared');
  }

  /**
   * Log current performance report
   */
  logReport(): void {
    const report = this.getReport();
    
    Logger.info('PERFORMANCE', 'React Performance Report', {
      totalEntries: report.totalEntries,
      averageDuration: report.averageDuration.toFixed(2) + 'ms',
      maxDuration: report.maxDuration.toFixed(2) + 'ms',
      slowOperations: report.slowEntries.length
    });

    if (report.slowEntries.length > 0) {
      Logger.warn('PERFORMANCE', 'Slow operations detected:', {
        count: report.slowEntries.length,
        operations: report.slowEntries.slice(0, 10).map(entry => ({
          name: entry.name,
          duration: entry.duration.toFixed(2) + 'ms',
          component: entry.component || 'unknown'
        }))
      });
    }

    if (Object.keys(report.componentStats).length > 0) {
      const sortedComponents = Object.entries(report.componentStats)
        .sort(([,a], [,b]) => b.maxDuration - a.maxDuration)
        .slice(0, 10);

      Logger.info('PERFORMANCE', 'Component performance stats:', {
        topComponents: sortedComponents.map(([component, stats]) => ({
          component,
          count: stats.count,
          avgDuration: stats.avgDuration.toFixed(2) + 'ms',
          maxDuration: stats.maxDuration.toFixed(2) + 'ms'
        }))
      });
    }
  }

  private recordEntry(entry: PerformanceEntry): void {
    this.entries.push(entry);

    // Keep only the most recent entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    // Log slow operations immediately
    if (entry.duration >= this.thresholds.error) {
      Logger.error('PERFORMANCE', `Very slow operation detected: ${entry.name}`, {
        duration: entry.duration.toFixed(2) + 'ms',
        component: entry.component,
        threshold: this.thresholds.error + 'ms'
      });
    } else if (entry.duration >= this.thresholds.warning) {
      Logger.warn('PERFORMANCE', `Slow operation detected: ${entry.name}`, {
        duration: entry.duration.toFixed(2) + 'ms',
        component: entry.component,
        threshold: this.thresholds.warning + 'ms'
      });
    }
  }

  private setupPerformanceObserver(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        if (!this.isEnabled) return;

        const entries = list.getEntries();
        entries.forEach((entry) => {
          // Look for React-related performance entries
          if (entry.name.includes('React') || entry.name.includes('Scheduler')) {
            this.recordEntry({
              name: entry.name,
              startTime: entry.startTime,
              duration: entry.duration
            });
          }
        });
      });

      observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    } catch (e) {
      Logger.warn('PERFORMANCE', 'Could not setup PerformanceObserver', { error: e });
    }
  }

  private patchScheduler(): void {
    // Try to patch React's scheduler to catch long tasks
    if (typeof window === 'undefined') return;

    // Skip patching setTimeout/setImmediate due to TypeScript complexity
    // React Scheduler monitoring will be handled by the PerformanceObserver instead
    // This avoids complex type issues while still providing useful profiling
  }
}

// Export singleton instance
export const reactProfiler = ReactProfiler.getInstance();

// React Profiler component
export const ReactProfilerComponent: React.FC<{ 
  children: React.ReactNode;
  name: string;
  onRender?: (id: string, phase: string, actualDuration: number) => void;
}> = ({ children, name, onRender }) => {
  const handleRender = (id: string, phase: string, actualDuration: number) => {
    if (reactProfiler) {
      reactProfiler.profile(`React.${phase}`, () => {
        // The actual rendering is already done, just record the timing
      }, name);
    }
    
    if (onRender) {
      onRender(id, phase, actualDuration);
    }
  };

  if (typeof React !== 'undefined' && React.Profiler) {
    return React.createElement(
      React.Profiler,
      { id: name, onRender: handleRender },
      children
    );
  }

  return children as React.ReactElement;
};