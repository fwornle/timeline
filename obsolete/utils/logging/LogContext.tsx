import React, { createContext, useContext, useCallback } from 'react';
import { logger } from './logger';
import type { LogContextType, LogProviderProps, LogTopic } from './types';

const LogContext = createContext<LogContextType | null>(null);

export function LogProvider({ children }: LogProviderProps) {
  const debug = useCallback((topic: LogTopic, message: string, data?: unknown, component?: string) => {
    logger.debug(topic, message, data, component);
  }, []);

  const info = useCallback((topic: LogTopic, message: string, data?: unknown, component?: string) => {
    logger.info(topic, message, data, component);
  }, []);

  const warn = useCallback((topic: LogTopic, message: string, data?: unknown, component?: string) => {
    logger.warn(topic, message, data, component);
  }, []);

  const error = useCallback((topic: LogTopic, message: string, data?: unknown, component?: string) => {
    logger.error(topic, message, data, component);
  }, []);

  return (
    <LogContext.Provider value={{ debug, info, warn, error }}>
      {children}
    </LogContext.Provider>
  );
}

export function useLogger() {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLogger must be used within a LogProvider');
  }
  return context;
}