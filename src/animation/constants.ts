/**
 * Default values for animation and UI elements
 */
export const DEFAULTS = {
  CARD: {
    SCALE: {
      DEFAULT: 1,
      HOVER: 1.1,
      SELECTED: 1.2,
    },
    ROTATION: {
      DEFAULT: [0, 0, 0] as const,
      HOVER: [0, 0.1, 0] as const,
      SELECTED: [0, 0.2, 0] as const,
    },
    POSITION_Y: {
      DEFAULT: 0,
      HOVER: 0.2,
      SELECTED: 0.5,
    },
  },
  SCROLL: {
    SPEED: 1,
    MIN_SPEED: 0.1,
    MAX_SPEED: 5,
  },
  CAMERA: {
    POSITION: [10, 5, 10] as const,
    FOV: 45,
    NEAR: 0.1,
    FAR: 1000,
  },
};

/**
 * Spring animation configurations
 */
export const SPRING_CONFIG = {
  GENTLE: {
    mass: 1,
    tension: 170,
    friction: 26,
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
    tension: 250,
    friction: 14,
  },
};
