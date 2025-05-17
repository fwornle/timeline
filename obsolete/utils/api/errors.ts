export class TimelineAPIError extends Error {
  readonly statusCode?: number;
  readonly originalError?: Error;

  constructor(message: string, statusCode?: number, originalError?: Error) {
    super(message);
    this.name = 'TimelineAPIError';
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

export class NetworkError extends TimelineAPIError {
  constructor(message: string, originalError?: Error) {
    super(message, undefined, originalError);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends TimelineAPIError {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class ServerError extends TimelineAPIError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
    this.name = 'ServerError';
  }
}

export class NotFoundError extends TimelineAPIError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}