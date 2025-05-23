/**
 * Default values for animation and UI elements
 * @deprecated Use the new configuration system from src/config instead
 */
import { animation, dimensions } from '../config';

export const DEFAULTS = {
  CARD: {
    SCALE: {
      DEFAULT: animation.card.scale.default,
      HOVER: animation.card.scale.hover,
      SELECTED: animation.card.scale.selected,
    },
    ROTATION: {
      DEFAULT: animation.card.rotation.default,
      HOVER: animation.card.rotation.hover,
      SELECTED: animation.card.rotation.selected,
    },
    POSITION_Y: {
      DEFAULT: animation.card.position.default,
      HOVER: animation.card.position.hover,
      SELECTED: animation.card.position.selected,
    },
  },
  SCROLL: {
    SPEED: animation.scroll.speed,
    MIN_SPEED: animation.scroll.minSpeed,
    MAX_SPEED: animation.scroll.maxSpeed,
  },
  CAMERA: {
    POSITION: dimensions.visualization.camera.defaultPosition,
    FOV: dimensions.visualization.camera.fov,
    NEAR: dimensions.visualization.camera.near,
    FAR: dimensions.visualization.camera.far,
  },
};

/**
 * Spring animation configurations
 */
export const SPRING_CONFIG = {
  GENTLE: {
    mass: 1,
    tension: 120,  // Reduced for smoother animation
    friction: 30,  // Increased to prevent oscillation
  },
  WOBBLY: {
    mass: 1,
    tension: 180,
    friction: 12,
  },
  STIFF: {
    mass: 1,
    tension: 210,
    friction: 20,
  },
  SLOW: {
    mass: 1,
    tension: 280,
    friction: 60,
  },
  MOLASSES: {
    mass: 1,
    tension: 280,
    friction: 120,
  },
  BOUNCY: {
    mass: 1.2,
    tension: 180,  // Reduced for smoother animation
    friction: 18,  // Increased to prevent excessive bouncing
  },
};
