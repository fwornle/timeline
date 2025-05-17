import * as THREE from 'three';
import { ANIMATION_DURATIONS, EASING, SPRING_CONFIG } from './constants';

export interface TransitionOptions {
  duration?: number;
  easing?: string;
  springConfig?: typeof SPRING_CONFIG.GENTLE;
}

// Create a smooth transition between two values
export function interpolate(
  start: number,
  end: number,
  progress: number,
  easing: string = EASING.EASE_IN_OUT
): number {
  // Apply easing function
  const easedProgress = easing === EASING.LINEAR
    ? progress
    : easing === EASING.BOUNCE
      ? 1 - Math.pow(1 - progress, 4)
      : progress * progress * (3 - 2 * progress); // Default ease-in-out

  return start + (end - start) * easedProgress;
}

// Create transition for Vector3 values
export function interpolateVector3(
  start: THREE.Vector3,
  end: THREE.Vector3,
  progress: number,
  easing: string = EASING.EASE_IN_OUT
): THREE.Vector3 {
  return new THREE.Vector3(
    interpolate(start.x, end.x, progress, easing),
    interpolate(start.y, end.y, progress, easing),
    interpolate(start.z, end.z, progress, easing)
  );
}

export interface SpringConfig {
  mass: number;
  tension: number;
  friction: number;
}

// Generate spring animation configuration
export function createSpringConfig(
  config: Partial<SpringConfig> = {}
): SpringConfig {
  const defaultConfig: SpringConfig = {
    mass: 1,
    tension: 170,
    friction: 26
  };

  return {
    ...defaultConfig,
    ...config,
  };
}

// Create transition timing function
export function createTimingFunction(options: TransitionOptions = {}) {
  const {
    duration = ANIMATION_DURATIONS.CARD_APPEAR,
    easing = EASING.EASE_IN_OUT
  } = options;
  
  return (t: number) => {
    const progress = Math.min(t / duration, 1);
    return interpolate(0, 1, progress, easing);
  };
}

// Helper to create transition keyframes
export function createKeyframes<T>(frames: Record<number, T>): Array<[number, T]> {
  return Object.entries(frames)
    .map(([time, value]): [number, T] => [parseFloat(time), value])
    .sort((a, b) => a[0] - b[0]);
}

// Get intermediate value at a specific time in a keyframe sequence
export function getKeyframeValue<T>(
  keyframes: Array<[number, T]>,
  time: number,
  interpolationFn: (start: T, end: T, progress: number) => T
): T {
  // Find the surrounding keyframes
  const startFrame = keyframes.find(([t]) => t <= time)!;
  const endFrame = keyframes.find(([t]) => t > time)!;

  if (!startFrame) return keyframes[0][1];
  if (!endFrame) return keyframes[keyframes.length - 1][1];

  // Calculate progress between keyframes
  const [startTime, startValue] = startFrame;
  const [endTime, endValue] = endFrame;
  const progress = (time - startTime) / (endTime - startTime);

  // Interpolate between values
  return interpolationFn(startValue, endValue, progress);
}

// Create a delay function for staggered animations
export function createStaggerDelay(index: number, stagger: number = 0.1): number {
  return index * stagger;
}