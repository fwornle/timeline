/**
 * Animation configuration for the Timeline application
 */

export const animation = {
  // Timing functions
  easing: {
    // Standard easing curves
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    
    // Custom cubic-bezier curves
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },

  // Duration presets (in milliseconds)
  duration: {
    instant: 0,
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
    slowest: 750,
  },

  // Spring configurations for react-spring
  spring: {
    // Default spring config
    default: {
      mass: 1,
      tension: 170,
      friction: 26
    },
    
    // Gentle spring for smooth animations
    gentle: {
      mass: 1,
      tension: 120,
      friction: 14
    },
    
    // Wobbly spring for playful animations
    wobbly: {
      mass: 1,
      tension: 180,
      friction: 12
    },
    
    // Stiff spring for quick, responsive animations
    stiff: {
      mass: 1,
      tension: 210,
      friction: 20
    },
    
    // Slow spring for deliberate animations
    slow: {
      mass: 1,
      tension: 280,
      friction: 60
    },
    
    // Molasses spring for very slow animations
    molasses: {
      mass: 1,
      tension: 280,
      friction: 120
    }
  },

  // Card animation configurations
  card: {
    // Scale animations
    scale: {
      default: 1,
      hover: 1.3,
      selected: 1.5,
      duration: 250,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },

    // Rotation animations
    rotation: {
      default: [0, 0, 0] as const,
      hover: [0, Math.PI * 2, 0] as const, // Full 360-degree rotation
      selected: [0, 0, 0] as const,
      duration: 250,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },

    // Position animations
    position: {
      default: 0,
      hover: 0.3,
      selected: 0.5,
      duration: 250,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },

    // Hover lock to prevent flickering
    hoverLock: {
      duration: 500, // milliseconds
      enabled: true
    }
  },

  // Wiggle animation for cards
  wiggle: {
    amplitude: 0.1,     // Maximum rotation in radians
    frequency: 8,       // Oscillations per second
    duration: 1000,     // Total animation duration in milliseconds
    easing: 'ease-in-out',
    enabled: true
  },

  // Timeline marker animations
  marker: {
    // Fade effect for the marker plane
    fade: {
      opacity: {
        default: 0.7,
        dragging: 0.9
      },
      duration: 150,
      easing: 'ease-out'
    },

    // Dragging animations
    drag: {
      damping: 0.9,
      stiffness: 100,
      mass: 1
    }
  },

  // Camera animations
  camera: {
    // Movement animations
    movement: {
      duration: 1000,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },

    // Focus animations
    focus: {
      duration: 800,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    },

    // View all animation
    viewAll: {
      duration: 1200,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    }
  },

  // UI component animations
  ui: {
    // Button hover effects
    button: {
      hover: {
        scale: 1.02,
        translateY: -1,
        duration: 200,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
      },
      press: {
        scale: 0.98,
        duration: 100,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }
    },

    // Modal animations
    modal: {
      enter: {
        opacity: {
          from: 0,
          to: 1,
          duration: 200
        },
        scale: {
          from: 0.95,
          to: 1,
          duration: 200,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        }
      },
      exit: {
        opacity: {
          from: 1,
          to: 0,
          duration: 150
        },
        scale: {
          from: 1,
          to: 0.95,
          duration: 150,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        }
      }
    },

    // Tooltip animations
    tooltip: {
      enter: {
        opacity: {
          from: 0,
          to: 1,
          duration: 150
        },
        translateY: {
          from: 4,
          to: 0,
          duration: 150,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        }
      },
      exit: {
        opacity: {
          from: 1,
          to: 0,
          duration: 100
        }
      }
    },

    // Loading animations
    loading: {
      spinner: {
        duration: 1000,
        easing: 'linear',
        iterations: 'infinite'
      },
      pulse: {
        duration: 2000,
        easing: 'ease-in-out',
        iterations: 'infinite'
      }
    }
  },

  // Scroll and timeline animations
  scroll: {
    speed: 2,
    minSpeed: 0.2,
    maxSpeed: 10,
    smoothing: 0.1
  },

  // Auto-drift animation
  autoDrift: {
    speed: 1,
    minSpeed: 0.1,
    maxSpeed: 5,
    defaultSpeed: 1
  }
};

// Animation state management
export const animationStates = {
  // Card states
  card: {
    idle: 'idle',
    hovering: 'hovering',
    selected: 'selected',
    wiggling: 'wiggling'
  },

  // UI states
  ui: {
    idle: 'idle',
    loading: 'loading',
    error: 'error',
    success: 'success'
  },

  // Camera states
  camera: {
    idle: 'idle',
    moving: 'moving',
    focusing: 'focusing',
    viewingAll: 'viewingAll'
  }
};

// Performance settings
export const performance = {
  // Reduce animations on low-end devices
  reducedMotion: {
    respectUserPreference: true,
    fallbackDuration: 0
  },

  // Frame rate targets
  frameRate: {
    target: 60,
    minimum: 30
  },

  // Animation culling
  culling: {
    enabled: true,
    distance: 100, // Don't animate cards beyond this distance
    frustum: true  // Only animate cards in camera view
  }
};
