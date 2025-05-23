/**
 * loggingColors.ts
 * 
 * Color configuration for the logging system.
 * Defines colors for different log categories and levels.
 */

// Base colors for text and backgrounds
export const baseColors = {
  white: '#ffffff',
  black: '#000000',
  lightGrey: '#cccccc',
  darkGrey: '#666666',
};

// Error and warning colors (reserved)
export const alertColors = {
  logErrorBg: 'rgba(220, 53, 69, 1)',   // Bootstrap danger red
  logWarnBg: 'rgba(255, 193, 7, 1)',    // Bootstrap warning orange
};

// Category colors for timeline app - each functional cluster has a distinct base color
export const categoryColors = {
  // Core system colors
  logDefault: 'rgba(108, 117, 125, 1)',      // Bootstrap secondary grey
  logLifecycle: 'rgba(40, 167, 69, 1)',      // Bootstrap success green
  logConfig: 'rgba(102, 16, 242, 1)',        // Purple
  
  // UI and interaction colors
  logUi: 'rgba(0, 123, 255, 1)',             // Bootstrap primary blue
  logData: 'rgba(23, 162, 184, 1)',          // Bootstrap info cyan
  
  // API and backend colors
  logApi: 'rgba(111, 66, 193, 1)',           // Indigo
  logCache: 'rgba(13, 202, 240, 1)',         // Light blue
  logServer: 'rgba(25, 135, 84, 1)',         // Dark green
  logAuth: 'rgba(214, 51, 132, 1)',          // Pink
  
  // Git and spec processing colors
  logGit: 'rgba(255, 99, 132, 1)',           // Coral red
  logSpec: 'rgba(54, 162, 235, 1)',          // Sky blue
  
  // Three.js and visualization colors
  logThree: 'rgba(75, 192, 192, 1)',         // Teal
  logAnimation: 'rgba(153, 102, 255, 1)',    // Light purple
  logCamera: 'rgba(255, 159, 64, 1)',        // Orange
  
  // Timeline specific colors
  logTimeline: 'rgba(255, 205, 86, 1)',      // Yellow
  logCards: 'rgba(201, 203, 207, 1)',        // Light grey
  logEvents: 'rgba(83, 102, 255, 1)',        // Blue violet
  
  // Performance monitoring
  logPerformance: 'rgba(255, 99, 255, 1)',   // Magenta
};

// Combine all colors for export
export const loggingColors = {
  ...baseColors,
  ...alertColors,
  ...categoryColors,
};

// Export individual color groups for easier access
export { baseColors as colors }; // For compatibility with original Logger
export default loggingColors;
