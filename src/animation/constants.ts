/**
 * Default values for animation and UI elements
 */
export const DEFAULTS = {
  CARD: {
    SCALE: {
      DEFAULT: 1,
      HOVER: 1.3,  // Increased for more noticeable hover effect
      SELECTED: 1.5,  // Increased for more noticeable selection
    },
    ROTATION: {
      DEFAULT: [0, 0, 0] as const,
      HOVER: [0, Math.PI * 2, 0] as const,  // Full 360-degree rotation
      SELECTED: [0, 0, 0] as const,  // No rotation for selected state
    },
    POSITION_Y: {
      DEFAULT: 0,
      HOVER: 0.3,  // Increased to make it more visible
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
