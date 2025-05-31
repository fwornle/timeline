/**
 * Dimension and sizing configuration for the Timeline application
 */

export const dimensions = {
  // Timeline cards
  card: {
    width: 3,
    height: 2.2,
    depth: 0.1,
    shadowOffset: {
      x: 0.08,
      y: -0.08,
      z: -0.05
    },
    shadowDepth: 0.05,
    contentOffset: {
      z: 0.06
    },
    header: {
      height: 0.3,
      yPosition: 0.95
    },
    selection: {
      padding: 0.2,
      depth: 0.01,
      zOffset: -0.06
    }
  },

  // Typography
  typography: {
    card: {
      headerTitle: {
        fontSize: 0.13,
        position: {
          x: -1.35,
          y: 0.95,
          z: 0.01
        }
      },
      mainText: {
        fontSize: 0.11,
        lineHeight: 0.15,
        position: {
          x: -1.35,
          z: 0.01
        }
      },
      typeIndicator: {
        fontSize: 0.14,
        position: {
          x: -1.35,
          y: -0.95,
          z: 0.01
        }
      },
      dateText: {
        fontSize: 0.12,
        position: {
          x: 1.35,
          y: -0.95,
          z: 0.01
        }
      },
      stats: {
        fontSize: 0.09,
        lineHeight: 0.12
      }
    }
  },

  // UI components
  ui: {
    // Top bar
    topBar: {
      minHeight: 64,
      padding: {
        x: 0,
        y: 0
      }
    },

    // Bottom bar
    bottomBar: {
      padding: {
        y: 12 // 3 * 4px (py-3)
      }
    },

    // Buttons
    button: {
      borderRadius: 6,
      padding: {
        small: {
          x: 12, // 0.75rem
          y: 6   // 0.375rem
        },
        medium: {
          x: 16, // 1rem
          y: 8   // 0.5rem
        }
      }
    },

    // Badges
    badge: {
      padding: {
        x: 12, // 0.75rem
        y: 8   // 0.5rem
      },
      fontSize: 12, // 0.75rem
      borderRadius: 4
    },

    // Modal
    modal: {
      borderRadius: 8,
      padding: {
        header: 16,
        body: 16,
        footer: 16
      }
    },

    // Form elements
    form: {
      borderRadius: 4,
      padding: {
        x: 12,
        y: 8
      }
    }
  },

  // 3D visualization
  visualization: {
    // Camera
    camera: {
      fov: 45,
      near: 0.1,
      far: 1000,
      defaultPosition: [10, 5, 10] as const
    },

    // Timeline axis
    axis: {
      tickSize: 0.5,
      tickInterval: 10,
      yPosition: 2
    },

    // Timeline marker
    marker: {
      width: 4,
      height: 2,
      yPosition: 2
    },

    // Lighting positions
    lighting: {
      directional: [5, 5, 5] as const,
      pointLight1: [-10, 0, -20] as const,
      pointLight2: [0, -10, 0] as const
    }
  },

  // Animation
  animation: {
    // Card animations
    card: {
      scale: {
        default: 1,
        hover: 1.3,
        selected: 1.5
      },
      position: {
        default: 0,
        hover: 0.3,
        selected: 0.5
      },
      // Smart positioning when opening cards
      smartPositioning: {
        // How far to move toward camera as percentage of distance
        forwardRatio: 0.4,
        // Minimum forward distance to ensure coverage of adjacent cards
        minForwardDistance: 5.0,
        // Safety margin from viewport edges (as percentage of viewport size)
        viewportMargin: 0.1,
        // Maximum distance from original position to maintain context
        maxOffsetDistance: 8.0,
        // How far to lift the card up for better visibility
        liftDistance: 2.0
      },
      duration: 250, // milliseconds
      hoverLockDuration: 500 // milliseconds
    },

    // Wiggle animation
    wiggle: {
      amplitude: 0.1, // radians
      frequency: 8,   // Hz
      duration: 1000  // milliseconds
    },

    // Timeline marker
    marker: {
      fadePlaneWidth: 25,
      fadePlaneHeight: 100
    }
  },

  // Layout
  layout: {
    // Main content area height calculation
    mainContentOffset: 112, // Height of top and bottom bars combined
    minHeight: 500,

    // Container constraints
    maxWidth: {
      container: '7xl', // Tailwind max-w-7xl
      modal: 320
    },

    // Spacing
    gap: {
      small: 8,   // 0.5rem
      medium: 12, // 0.75rem
      large: 16,  // 1rem
      xlarge: 24  // 1.5rem
    }
  }
};

// Breakpoints for responsive design
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

// Z-index layers
export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  cameraDetails: 99999
};
