import { useCallback } from 'react';
import type { LogTopic } from '../types';
import { useLogger as useBaseLogger } from '../LogContext';

interface UseLoggerOptions {
  component: string;
  topic?: LogTopic;
}

export function useLogger({ component, topic = 'ui' }: UseLoggerOptions) {
  const baseLogger = useBaseLogger();

  const debug = useCallback((message: string, data?: unknown) => {
    baseLogger.debug(topic, message, data, component);
  }, [baseLogger, component, topic]);

  const info = useCallback((message: string, data?: unknown) => {
    baseLogger.info(topic, message, data, component);
  }, [baseLogger, component, topic]);

  const warn = useCallback((message: string, data?: unknown) => {
    baseLogger.warn(topic, message, data, component);
  }, [baseLogger, component, topic]);

  const error = useCallback((message: string, data?: unknown) => {
    baseLogger.error(topic, message, data, component);
  }, [baseLogger, component, topic]);

  return {
    debug,
    info,
    warn,
    error
  };
}