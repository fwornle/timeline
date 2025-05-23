/**
 * Color configuration for the Timeline application
 * Using RGBA values for better transparency control and consistency
 */

export const colors = {
  // Primary color palette (grey-blue theme)
  primary: {
    50: 'rgba(248, 250, 252, 1)',    // #f8fafc
    100: 'rgba(241, 245, 249, 1)',   // #f1f5f9
    200: 'rgba(226, 232, 240, 1)',   // #e2e8f0
    300: 'rgba(203, 213, 225, 1)',   // #cbd5e1
    400: 'rgba(148, 163, 184, 1)',   // #94a3b8
    500: 'rgba(100, 116, 139, 1)',   // #64748b
    600: 'rgba(71, 85, 105, 1)',     // #475569
    700: 'rgba(51, 65, 85, 1)',      // #334155
    800: 'rgba(30, 41, 59, 1)',      // #1e293b
    900: 'rgba(15, 23, 42, 1)',      // #0f172a
  },

  // Accent color palette (blue theme)
  accent: {
    50: 'rgba(239, 246, 255, 1)',    // #eff6ff
    100: 'rgba(219, 234, 254, 1)',   // #dbeafe
    200: 'rgba(191, 219, 254, 1)',   // #bfdbfe
    300: 'rgba(147, 197, 253, 1)',   // #93c5fd
    400: 'rgba(96, 165, 250, 1)',    // #60a5fa
    500: 'rgba(59, 130, 246, 1)',    // #3b82f6
    600: 'rgba(37, 99, 235, 1)',     // #2563eb
    700: 'rgba(29, 78, 216, 1)',     // #1d4ed8
    800: 'rgba(30, 64, 175, 1)',     // #1e40af
    900: 'rgba(30, 58, 138, 1)',     // #1e3a8a
  },

  // Surface colors
  surface: {
    light: 'rgba(255, 255, 255, 1)',      // #ffffff
    dark: 'rgba(15, 23, 42, 1)',          // #0f172a
    elevated: {
      light: 'rgba(248, 250, 252, 1)',    // #f8fafc
      dark: 'rgba(30, 41, 59, 1)',        // #1e293b
    }
  },

  // Text colors
  text: {
    primary: {
      light: 'rgba(15, 23, 42, 1)',       // #0f172a
      dark: 'rgba(248, 250, 252, 1)',     // #f8fafc
    },
    secondary: {
      light: 'rgba(71, 85, 105, 1)',      // #475569
      dark: 'rgba(203, 213, 225, 1)',     // #cbd5e1
    }
  },

  // Border colors
  border: {
    light: 'rgba(226, 232, 240, 1)',      // #e2e8f0
    dark: 'rgba(51, 65, 85, 1)',          // #334155
  },

  // Semantic colors
  success: 'rgba(16, 185, 129, 1)',       // #10b981
  warning: 'rgba(245, 158, 11, 1)',       // #f59e0b
  error: 'rgba(239, 68, 68, 1)',          // #ef4444

  // Timeline card colors - more distinguishable
  cards: {
    git: {
      // Git commits - Deep blue theme
      background: 'rgba(30, 58, 138, 0.95)',     // accent-900 with opacity
      header: 'rgba(29, 78, 216, 0.9)',          // accent-700 with opacity
      text: 'rgba(255, 255, 255, 1)',            // white
      accent: 'rgba(147, 197, 253, 1)',          // accent-300 for highlights
      shadow: 'rgba(0, 0, 0, 0.3)',              // black with opacity
    },
    spec: {
      // Spec changes - Warm orange/amber theme for contrast
      background: 'rgba(146, 64, 14, 0.95)',     // amber-800 equivalent
      header: 'rgba(217, 119, 6, 0.9)',          // amber-600 equivalent
      text: 'rgba(255, 255, 255, 1)',            // white
      accent: 'rgba(252, 211, 77, 1)',           // amber-300 equivalent
      shadow: 'rgba(0, 0, 0, 0.3)',              // black with opacity
    }
  },

  // 3D visualization colors
  visualization: {
    // Timeline axis
    axis: 'rgba(102, 102, 102, 1)',              // #666666

    // Timeline marker
    marker: {
      default: 'rgba(0, 255, 0, 0.7)',           // green with opacity
      dragging: 'rgba(0, 255, 0, 0.9)',          // more opaque when dragging
    },

    // Lighting
    ambient: 'rgba(255, 255, 255, 0.7)',         // white with opacity
    directional: 'rgba(255, 255, 255, 1.5)',     // white (intensity > 1)
    pointLight1: 'rgba(67, 56, 202, 0.5)',       // indigo-600 with opacity
    pointLight2: 'rgba(14, 165, 233, 0.5)',      // sky-500 with opacity

    // Background
    background: 'rgba(15, 23, 42, 1)',           // primary-900 (midnight dark blue)
  },

  // UI component colors
  ui: {
    // Buttons
    button: {
      primary: {
        background: 'rgba(37, 99, 235, 1)',      // accent-600
        hover: 'rgba(29, 78, 216, 1)',           // accent-700
        text: 'rgba(255, 255, 255, 1)',          // white
      },
      secondary: {
        background: 'rgba(0, 0, 0, 0)',          // transparent
        border: 'rgba(148, 163, 184, 1)',        // primary-400
        hover: 'rgba(241, 245, 249, 1)',         // primary-100
        text: 'rgba(51, 65, 85, 1)',             // primary-700
      }
    },

    // Badges
    badge: {
      git: 'rgba(71, 85, 105, 1)',               // primary-600
      spec: 'rgba(37, 99, 235, 1)',              // accent-600
      debug: 'rgba(15, 23, 42, 1)',              // primary-900
      time: 'rgba(59, 130, 246, 1)',             // accent-500
      mocked: 'rgba(245, 158, 11, 1)',           // warning
    },

    // Form elements
    form: {
      background: 'rgba(255, 255, 255, 1)',      // white
      border: 'rgba(226, 232, 240, 1)',          // border-light
      focus: 'rgba(37, 99, 235, 1)',             // accent-600
      text: 'rgba(15, 23, 42, 1)',               // text-primary-light
    }
  }
};

// CSS variable mappings for easy integration
export const cssVariables = {
  '--color-primary-50': colors.primary[50],
  '--color-primary-100': colors.primary[100],
  '--color-primary-200': colors.primary[200],
  '--color-primary-300': colors.primary[300],
  '--color-primary-400': colors.primary[400],
  '--color-primary-500': colors.primary[500],
  '--color-primary-600': colors.primary[600],
  '--color-primary-700': colors.primary[700],
  '--color-primary-800': colors.primary[800],
  '--color-primary-900': colors.primary[900],

  '--color-accent-50': colors.accent[50],
  '--color-accent-100': colors.accent[100],
  '--color-accent-200': colors.accent[200],
  '--color-accent-300': colors.accent[300],
  '--color-accent-400': colors.accent[400],
  '--color-accent-500': colors.accent[500],
  '--color-accent-600': colors.accent[600],
  '--color-accent-700': colors.accent[700],
  '--color-accent-800': colors.accent[800],
  '--color-accent-900': colors.accent[900],

  '--color-surface-light': colors.surface.light,
  '--color-surface-dark': colors.surface.dark,
  '--color-surface-elevated-light': colors.surface.elevated.light,
  '--color-surface-elevated-dark': colors.surface.elevated.dark,

  '--color-text-primary-light': colors.text.primary.light,
  '--color-text-secondary-light': colors.text.secondary.light,
  '--color-text-primary-dark': colors.text.primary.dark,
  '--color-text-secondary-dark': colors.text.secondary.dark,

  '--color-border-light': colors.border.light,
  '--color-border-dark': colors.border.dark,

  '--color-success': colors.success,
  '--color-warning': colors.warning,
  '--color-error': colors.error,
};

// Utility functions for Three.js compatibility
export const colorUtils = {
  // Convert RGBA string to hex for Three.js materials
  rgbaToHex: (rgba: string): string => {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return rgba;

    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  },

  // Extract opacity from RGBA string
  getOpacity: (rgba: string): number => {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match || !match[4]) return 1;
    return parseFloat(match[4]);
  },

  // Get Three.js compatible color and opacity from RGBA
  getThreeColor: (rgba: string): { color: string; opacity: number } => {
    return {
      color: colorUtils.rgbaToHex(rgba),
      opacity: colorUtils.getOpacity(rgba)
    };
  }
};

// Three.js compatible color definitions (hex format)
export const threeColors = {
  cards: {
    git: {
      background: colorUtils.rgbaToHex(colors.cards.git.background),
      header: colorUtils.rgbaToHex(colors.cards.git.header),
      text: colorUtils.rgbaToHex(colors.cards.git.text),
      accent: colorUtils.rgbaToHex(colors.cards.git.accent),
      shadow: colorUtils.rgbaToHex(colors.cards.git.shadow),
    },
    spec: {
      background: colorUtils.rgbaToHex(colors.cards.spec.background),
      header: colorUtils.rgbaToHex(colors.cards.spec.header),
      text: colorUtils.rgbaToHex(colors.cards.spec.text),
      accent: colorUtils.rgbaToHex(colors.cards.spec.accent),
      shadow: colorUtils.rgbaToHex(colors.cards.spec.shadow),
    }
  },
  visualization: {
    axis: colorUtils.rgbaToHex(colors.visualization.axis),
    marker: {
      default: colorUtils.rgbaToHex(colors.visualization.marker.default),
      dragging: colorUtils.rgbaToHex(colors.visualization.marker.dragging),
    },
    background: colorUtils.rgbaToHex(colors.visualization.background),
  },
  warning: colorUtils.rgbaToHex(colors.warning),
};

// Opacity values for Three.js materials
export const threeOpacities = {
  cards: {
    git: {
      background: colorUtils.getOpacity(colors.cards.git.background),
      header: colorUtils.getOpacity(colors.cards.git.header),
      shadow: colorUtils.getOpacity(colors.cards.git.shadow),
    },
    spec: {
      background: colorUtils.getOpacity(colors.cards.spec.background),
      header: colorUtils.getOpacity(colors.cards.spec.header),
      shadow: colorUtils.getOpacity(colors.cards.spec.shadow),
    }
  },
  visualization: {
    marker: {
      default: colorUtils.getOpacity(colors.visualization.marker.default),
      dragging: colorUtils.getOpacity(colors.visualization.marker.dragging),
    }
  }
};
