// Animation durations (in seconds)
export const ANIMATION_DURATIONS = {
  CARD_APPEAR: 0.5,
  CARD_HOVER: 0.2,
  CARD_SELECT: 0.3,
  CAMERA_MOVE: 1.0,
  TIMELINE_SCROLL: 0.8,
} as const;

// Animation easing functions
export const EASING = {
  // Standard easing
  LINEAR: 'linear',
  EASE_IN_OUT: 'easeInOut',
  
  // Custom easing curves
  ELASTIC: 'elastic.out(1, 0.3)',
  BOUNCE: 'bounce.out',
  BACK: 'back.out(1.7)',
} as const;

// Animation states for timeline cards
export const CARD_STATES = {
  HIDDEN: 'hidden',
  VISIBLE: 'visible',
  HOVERED: 'hovered',
  SELECTED: 'selected',
} as const;

// Default animation configurations
export const DEFAULTS = {
  // Card transform values
  CARD: {
    SCALE: {
      DEFAULT: 1,
      HOVER: 1.1,
      SELECTED: 1.2,
    },
    ROTATION: {
      DEFAULT: [0, 0, 0],
      HOVER: [0, Math.PI * 0.02, 0],
      SELECTED: [0, Math.PI * 0.05, 0],
    },
    POSITION_Y: {
      DEFAULT: 0,
      HOVER: 0.2,
      SELECTED: 0.5,
    },
  },
  
  // Camera movement limits
  CAMERA: {
    MIN_DISTANCE: 5,
    MAX_DISTANCE: 100,
    MIN_POLAR_ANGLE: Math.PI / 4,
    MAX_POLAR_ANGLE: Math.PI / 2,
  },
  
  // Timeline scroll behavior
  SCROLL: {
    SPEED: 1.5,
    DAMPING: 0.9,
    RESISTANCE: 0.1,
  },
} as const;

// Spring animation configurations
export const SPRING_CONFIG: Record<string, { mass: number; tension: number; friction: number }> = {
  GENTLE: {
    mass: 1,
    tension: 170,
    friction: 26,
  },
  RESPONSIVE: {
    mass: 1,
    tension: 200,
    friction: 20,
  },
  BOUNCY: {
    mass: 1,
    tension: 280,
    friction: 18,
  },
};