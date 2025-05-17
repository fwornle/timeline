/**
 * Base error class for Timeline API errors
 */
export class TimelineAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimelineAPIError';
  }
}

/**
 * Error for server-side errors (500 status codes)
 */
export class ServerError extends TimelineAPIError {
  constructor(message: string = 'Server error occurred') {
    super(message);
    this.name = 'ServerError';
  }
}

/**
 * Error for not found resources (404 status codes)
 */
export class NotFoundError extends TimelineAPIError {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Error for network issues
 */
export class NetworkError extends TimelineAPIError {
  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Error for authentication issues
 */
export class AuthenticationError extends TimelineAPIError {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error for validation issues
 */
export class ValidationError extends TimelineAPIError {
  constructor(message: string = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
  }
}
