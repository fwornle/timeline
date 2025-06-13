/**
 * Configuration for metrics visualization components
 */

export const metricsConfig = {
  // Chart dimensions
  chart: {
    width: 800,
    height: 120,
    margin: {
      top: 10,
      right: 40, // Reduced for full width usage
      bottom: 35, // Increased for weekday labels
      left: 40,
    },
  },

  // Colors for different metrics
  colors: {
    linesOfCode: {
      line: '#3b82f6',
      lineHover: '#1e40af',
      button: 'bg-blue-500',
      buttonHover: 'hover:bg-blue-600',
      indicator: 'bg-blue-400',
    },
    totalFiles: {
      line: '#10b981',
      lineHover: '#047857',
      button: 'bg-green-500',
      buttonHover: 'hover:bg-green-600',
      indicator: 'bg-green-400',
    },
    commitCount: {
      line: '#f59e0b',
      lineHover: '#d97706',
      button: 'bg-amber-500',
      buttonHover: 'hover:bg-amber-600',
      indicator: 'bg-amber-400',
    },
    currentPosition: {
      fill: '#fbbf24',
      stroke: '#f59e0b',
    },
  },

  // Typography
  typography: {
    axis: {
      fill: '#f1f5f9', // Very light gray for excellent readability
      fontSize: 11,
      fontFamily: 'system-ui',
      fontWeight: '500',
    },
    tooltip: {
      title: {
        fill: '#ffffff',
        fontSize: 11,
        fontWeight: 'bold',
      },
      content: {
        fill: '#f1f5f9',
        fontSize: 10,
      },
    },
    header: {
      fill: '#f8fafc', // Almost white for header text
      fontSize: 13,
      fontWeight: '600',
    },
  },

  // Layout
  layout: {
    expandedHeight: 200,
    compactHeight: 35,
    headerHeight: 35,
  },

  // Grid and background
  grid: {
    horizontal: 'rgba(148, 163, 184, 0.08)',
    vertical: 'rgba(148, 163, 184, 0.06)',
    strokeWidth: 0.5,
  },

  // Interactive elements
  points: {
    radius: {
      normal: 2,
      hovered: 3.5,
      current: 4.5,
    },
    strokeWidth: {
      normal: 1,
      current: 2,
    },
  },

  // Tooltip
  tooltip: {
    background: 'rgba(0, 0, 0, 0.9)',
    border: 'rgba(148, 163, 184, 0.6)',
    borderRadius: 6,
    width: 120,
    height: 50,
  },
};

// Helper function to get metric config by key
export const getMetricConfig = (metricKey: string) => {
  switch (metricKey) {
    case 'linesOfCode':
      return metricsConfig.colors.linesOfCode;
    case 'totalFiles':
      return metricsConfig.colors.totalFiles;
    case 'commitCount':
      return metricsConfig.colors.commitCount;
    default:
      return metricsConfig.colors.linesOfCode;
  }
};

// Metric display labels
export const metricLabels = {
  linesOfCode: 'LOC',
  totalFiles: 'Files',
  commitCount: 'Commits',
};