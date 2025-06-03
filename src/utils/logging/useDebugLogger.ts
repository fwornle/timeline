import { useLogger } from './hooks/useLogger';

/**
 * Safe wrapper around useLogger for debugging purposes
 */
export function useDebugLogger(component: string, topic: string) {
  const logger = useLogger({ component, topic });
  
  return {
    debug: (message: string, data?: Record<string, unknown>) => {
      try {
        if (logger && logger.debug) {
          logger.debug(message, data);
        }
      } catch (e) {
        // Silently fail if logger is not available
        console.log(`[${component}:${topic}] ${message}`, data);
      }
    },
    info: (message: string, data?: Record<string, unknown>) => {
      try {
        if (logger && logger.info) {
          logger.info(message, data);
        }
      } catch (e) {
        console.info(`[${component}:${topic}] ${message}`, data);
      }
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      try {
        if (logger && logger.warn) {
          logger.warn(message, data);
        }
      } catch (e) {
        console.warn(`[${component}:${topic}] ${message}`, data);
      }
    },
    error: (message: string, data?: Record<string, unknown>) => {
      try {
        if (logger && logger.error) {
          logger.error(message, data);
        }
      } catch (e) {
        console.error(`[${component}:${topic}] ${message}`, data);
      }
    }
  };
}