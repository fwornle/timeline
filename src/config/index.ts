/**
 * Main configuration export file
 * Centralizes all configuration imports for easy access
 */

import { colors as colorsConfig, cssVariables, colorUtils, threeColors, threeOpacities } from './colors';
import { dimensions as dimensionsConfig, breakpoints, zIndex } from './dimensions';
import { animation as animationConfig, animationStates, performance } from './animation';
import { metricsConfig, getMetricConfig, metricLabels } from './metricsConfig';

// Main exports
export { colorsConfig as colors, cssVariables, colorUtils, threeColors, threeOpacities };
export { dimensionsConfig as dimensions, breakpoints, zIndex };
export { animationConfig as animation, animationStates, performance };
export { metricsConfig, getMetricConfig, metricLabels };

// Re-export specific commonly used configurations for convenience
export const {
  primary,
  accent,
  surface,
  text,
  border,
  success,
  warning,
  error,
  cards,
  visualization,
  ui
} = colorsConfig;

export const {
  card,
  typography,
  layout
} = dimensionsConfig;

export const {
  duration,
  easing,
  spring
} = animationConfig;

// Configuration validation and utilities
export const config = {
  // Validate that all required configurations are present
  validate: () => {
    const requiredConfigs = [
      'colors',
      'dimensions',
      'animation'
    ];

    const missing = requiredConfigs.filter(config => {
      try {
        require(`./${config}`);
        return false;
      } catch {
        return true;
      }
    });

    if (missing.length > 0) {
      throw new Error(`Missing configuration files: ${missing.join(', ')}`);
    }

    return true;
  },

  // Get configuration by path (e.g., 'colors.cards.git.background')
  get: (path: string) => {
    const parts = path.split('.');
    let current: any = { colors: colorsConfig, dimensions: dimensionsConfig, animation: animationConfig };

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  },

  // Check if the user prefers reduced motion
  prefersReducedMotion: () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  },

  // Get appropriate animation duration based on user preferences
  getAnimationDuration: (normalDuration: number) => {
    return config.prefersReducedMotion() ? 0 : normalDuration;
  },

  // Convert RGBA string to object
  parseRGBA: (rgba: string) => {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return null;

    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
      a: match[4] ? parseFloat(match[4]) : 1
    };
  },

  // Convert RGBA object to string
  rgbaToString: (r: number, g: number, b: number, a: number = 1) => {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  },

  // Lighten or darken a color
  adjustColor: (rgba: string, amount: number) => {
    const parsed = config.parseRGBA(rgba);
    if (!parsed) return rgba;

    const adjust = (value: number) => {
      const adjusted = value + (amount * 255);
      return Math.max(0, Math.min(255, Math.round(adjusted)));
    };

    return config.rgbaToString(
      adjust(parsed.r),
      adjust(parsed.g),
      adjust(parsed.b),
      parsed.a
    );
  },

  // Create a semi-transparent version of a color
  withOpacity: (rgba: string, opacity: number) => {
    const parsed = config.parseRGBA(rgba);
    if (!parsed) return rgba;

    return config.rgbaToString(parsed.r, parsed.g, parsed.b, opacity);
  }
};

// Environment-specific configurations
export const environment = {
  development: {
    enableDebugMode: true,
    showPerformanceMetrics: true,
    verboseLogging: true
  },

  production: {
    enableDebugMode: false,
    showPerformanceMetrics: false,
    verboseLogging: false
  },

  test: {
    enableDebugMode: false,
    showPerformanceMetrics: false,
    verboseLogging: false,
    disableAnimations: true
  }
};

// Get current environment configuration
export const getCurrentEnvironment = () => {
  const env = process.env.NODE_ENV || 'development';
  return environment[env as keyof typeof environment] || environment.development;
};
