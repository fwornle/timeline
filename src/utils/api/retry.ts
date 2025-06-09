/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  timeout: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  timeout: 15000,
};

/**
 * Wraps a function with retry logic
 * @param fn The function to retry
 * @param config Retry configuration
 * @returns A function that will retry the original function
 */
export function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxAttempts, initialDelay, maxDelay } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  return new Promise<T>((resolve, reject) => {
    (async () => {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxAttempts) {
      try {
        const result = await fn();
        return resolve(result);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        // If this was the last attempt, break out of the loop
        if (attempt >= maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          initialDelay * Math.pow(2, attempt - 1),
          maxDelay
        );

        // Wait before next attempt
        await new Promise((r) => setTimeout(r, delay));
      }
    }

      reject(lastError);
    })();
  });
}
