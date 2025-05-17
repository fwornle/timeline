import type { ReactNode } from 'react';

// Re-export existing types from LogLevel.ts to centralize type definitions
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
  | 'ui'
  | 'storage'
  | 'routes'
  | 'api'
  | 'system';

export interface LogEntry {
  level: LogLevel;
  topic: LogTopic;
  message: string;
  timestamp: Date;
  data?: unknown;
  component?: string;
}

export interface LogContextType {
  debug: (topic: LogTopic, message: string, data?: unknown, component?: string) => void;
  info: (topic: LogTopic, message: string, data?: unknown, component?: string) => void;
  warn: (topic: LogTopic, message: string, data?: unknown, component?: string) => void;
  error: (topic: LogTopic, message: string, data?: unknown, component?: string) => void;
}

export interface LogProviderProps {
  children: ReactNode;
}

export const isLogLevelEnabled = (configuredLevel: LogLevel, messageLevel: LogLevel): boolean => {
  return LogLevelPriority[messageLevel] >= LogLevelPriority[configuredLevel];
};