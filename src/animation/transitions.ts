/**
 * Spring configuration for animations
 */
export interface SpringConfig {
  mass: number;
  tension: number;
  friction: number;
}

/**
 * Creates a spring configuration with optional overrides
 */
export function createSpringConfig(
  baseConfig: SpringConfig,
  overrides: Partial<SpringConfig> = {}
): SpringConfig {
  return {
    ...baseConfig,
    ...overrides,
  };
}

/**
 * Easing functions for animations
 */
export const easings = {
  // No easing, no acceleration
  linear: (t: number) => t,
  
  // Accelerating from zero velocity
  easeInQuad: (t: number) => t * t,
  
  // Decelerating to zero velocity
  easeOutQuad: (t: number) => t * (2 - t),
  
  // Acceleration until halfway, then deceleration
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  
  // Accelerating from zero velocity
  easeInCubic: (t: number) => t * t * t,
  
  // Decelerating to zero velocity
  easeOutCubic: (t: number) => --t * t * t + 1,
  
  // Acceleration until halfway, then deceleration
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  // Accelerating from zero velocity
  easeInQuart: (t: number) => t * t * t * t,
  
  // Decelerating to zero velocity
  easeOutQuart: (t: number) => 1 - --t * t * t * t,
  
  // Acceleration until halfway, then deceleration
  easeInOutQuart: (t: number) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,
  
  // Accelerating from zero velocity
  easeInQuint: (t: number) => t * t * t * t * t,
  
  // Decelerating to zero velocity
  easeOutQuint: (t: number) => 1 + --t * t * t * t * t,
  
  // Acceleration until halfway, then deceleration
  easeInOutQuint: (t: number) =>
    t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t,
};
