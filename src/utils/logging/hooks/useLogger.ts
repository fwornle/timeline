import { useCallback } from 'react';
import { logger, LogLevel } from '../Logger';

interface LoggerContext {
  component: string;
  topic: string;
}

/**
 * Hook for component-specific logging
 */
export function useLogger(context: LoggerContext) {
  const { component, topic } = context;

  const debug = useCallback(
    (message: string, data?: Record<string, unknown>) => {
      logger.log(LogLevel.DEBUG, component, topic, message, data);
    },
    [component, topic]
  );

  const info = useCallback(
    (message: string, data?: Record<string, unknown>) => {
      logger.log(LogLevel.INFO, component, topic, message, data);
    },
    [component, topic]
  );

  const warn = useCallback(
    (message: string, data?: Record<string, unknown>) => {
      logger.log(LogLevel.WARN, component, topic, message, data);
    },
    [component, topic]
  );

  const error = useCallback(
    (message: string, data?: Record<string, unknown>) => {
      logger.log(LogLevel.ERROR, component, topic, message, data);
    },
    [component, topic]
  );

  const trace = useCallback(
    (message: string, data?: Record<string, unknown>) => {
      logger.log(LogLevel.TRACE, component, topic, message, data);
    },
    [component, topic]
  );

  return {
    debug,
    info,
    warn,
    error,
    trace,
  };
}
