export const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

export const LogLevelColor = {
  [LogLevel.DEBUG]: '#7c7c7c',
  [LogLevel.INFO]: '#4caf50',
  [LogLevel.WARN]: '#ff9800',
  [LogLevel.ERROR]: '#f44336'
} as const;

export const LogLevelPriority = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3
} as const;

export type LogTopic = 
  | 'timeline'
  | 'animation'
  | 'data'
  | 'config'
  | 'rendering'
  | 'ui';

export const isLogLevelEnabled = (configuredLevel: LogLevel, messageLevel: LogLevel): boolean => {
  return LogLevelPriority[messageLevel] >= LogLevelPriority[configuredLevel];
};