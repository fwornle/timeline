import { logger } from '../logging/logger';
import { TimelineAPIError, NetworkError, TimeoutError, ServerError } from './errors';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  timeout?: number;
  shouldRetry?: (error: Error) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  timeout: 15000,
  shouldRetry: (error: Error) => {
    if (error instanceof TimelineAPIError) {
      // Retry on network errors or 5xx server errors
      if (error instanceof NetworkError) return true;
      if (error instanceof ServerError && error.statusCode) {
        return error.statusCode >= 500;
      }
    }
    return false;
  }
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createTimeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(`Request timed out after ${ms}ms`));
    }, ms);
  });
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error;
  let attempt = 1;

  while (attempt <= opts.maxAttempts) {
    try {
      // Create a race between the operation and timeout
      const result = await Promise.race([
        operation(),
        createTimeoutPromise(opts.timeout)
      ]);
      
      // If successful, log the success if it wasn't the first attempt
      if (attempt > 1) {
        logger.info(
          'data',
          `Operation succeeded after ${attempt} attempts`,
          { attempt }
        );
      }
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === opts.maxAttempts || !opts.shouldRetry(lastError)) {
        logger.error(
          'data',
          `Operation failed after ${attempt} attempts`,
          { 
            error: lastError,
            attempt,
            maxAttempts: opts.maxAttempts 
          }
        );
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const backoffDelay = Math.min(
        opts.initialDelay * Math.pow(2, attempt - 1),
        opts.maxDelay
      );

      logger.warn(
        'data',
        `Attempt ${attempt} failed, retrying in ${backoffDelay}ms`,
        { 
          error: lastError,
          attempt,
          backoffDelay
        }
      );

      await delay(backoffDelay);
      attempt++;
    }
  }

  throw lastError!;
}