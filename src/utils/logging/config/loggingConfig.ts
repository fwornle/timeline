/**
 * loggingConfig.ts
 *
 * Configuration for the Logger module.
 * Defines levels, categories, and their associated properties.
 */

// Configure individual level properties
interface LogLevelConfig {
  name: string;
  value: number;
}

interface LogCategoryConfig {
  name: string;
  logColorKey: string;
}

// Define levels with names and values for potential numeric comparison later
const LOG_LEVELS: Record<string, LogLevelConfig> = {
  ERROR: { name: 'ERROR', value: 0 },
  WARN:  { name: 'WARN',  value: 1 },
  INFO:  { name: 'INFO',  value: 2 },
  DEBUG: { name: 'DEBUG', value: 3 },
  TRACE: { name: 'TRACE', value: 4 },
};

// Configure individual category properties for timeline app
const LOG_CATEGORIES: Record<string, LogCategoryConfig> = {
  DEFAULT:         { name: 'DEFAULT',         logColorKey: 'logDefault' },
  LIFECYCLE:       { name: 'LIFECYCLE',       logColorKey: 'logLifecycle' },
  CONFIG:          { name: 'CONFIG',          logColorKey: 'logConfig' },
  UI:              { name: 'UI',              logColorKey: 'logUi' },
  DATA:            { name: 'DATA',            logColorKey: 'logData' },
  API:             { name: 'API',             logColorKey: 'logApi' },
  CACHE:           { name: 'CACHE',           logColorKey: 'logCache' },
  GIT:             { name: 'GIT',             logColorKey: 'logGit' },
  SPEC:            { name: 'SPEC',            logColorKey: 'logSpec' },
  THREE:           { name: 'THREE',           logColorKey: 'logThree' },
  ANIMATION:       { name: 'ANIMATION',       logColorKey: 'logAnimation' },
  CAMERA:          { name: 'CAMERA',          logColorKey: 'logCamera' },
  TIMELINE:        { name: 'TIMELINE',        logColorKey: 'logTimeline' },
  CARDS:           { name: 'CARDS',           logColorKey: 'logCards' },
  EVENTS:          { name: 'EVENTS',          logColorKey: 'logEvents' },
  PERFORMANCE:     { name: 'PERFORMANCE',     logColorKey: 'logPerformance' },
  SERVER:          { name: 'SERVER',          logColorKey: 'logServer' },
  AUTH:            { name: 'AUTH',            logColorKey: 'logAuth' },
};

// Export constants for use in the Logger and potentially elsewhere
export const LogLevels = Object.keys(LOG_LEVELS).reduce((acc, key) => {
  acc[key] = LOG_LEVELS[key].name;
  return acc;
}, {} as Record<string, string>);

export const LogCategories = Object.keys(LOG_CATEGORIES).reduce((acc, key) => {
  acc[key] = LOG_CATEGORIES[key].name;
  return acc;
}, {} as Record<string, string>);

// Export the raw configuration objects as well, needed by the Logger for styling/filtering
export const levelsConfig = LOG_LEVELS;
export const categoriesConfig = LOG_CATEGORIES;

// Define initial active state separately - Logger will handle this internally
export const initialActiveLevels = [LogLevels.ERROR, LogLevels.WARN]; // Default to WARN and above only
export const initialActiveCategories = Object.values(LogCategories); // Start with all active

// Export types for TypeScript
export type LogLevel = keyof typeof LogLevels;
export type LogCategory = keyof typeof LogCategories;
export type { LogLevelConfig, LogCategoryConfig };
