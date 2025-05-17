import type { SpecTimelineEvent } from '../types/TimelineEvent';
import { configUtils } from '../../config/config';
import { logger } from '../../utils/logging/logger';
import { withRetry } from '../../utils/api/retry';
import { TimelineAPIError, ServerError, NotFoundError, NetworkError } from '../../utils/api/errors';

interface SpecHistoryResponse {
  specId?: string;
  id?: string;
  version?: string;
  timestamp: string;
  title: string;
  description?: string;
  changes?: SpecChangeResponse[];
  status?: string;
  author?: string;
  tags?: string[];
}

interface SpecChangeResponse {
  field: string;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
}

export interface SpecServiceConfig {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  timeout?: number;
  specPath?: string;
}

export class SpecStoryService {
  private baseUrl: string;
  private config: Required<SpecServiceConfig>;
  private repository: string;

  constructor(
    baseUrl: string,
    repository: string,
    config: SpecServiceConfig = {}
  ) {
    this.baseUrl = baseUrl;
    this.repository = repository;
    this.config = {
      maxAttempts: config.maxAttempts ?? 3,
      initialDelay: config.initialDelay ?? 1000,
      maxDelay: config.maxDelay ?? 10000,
      timeout: config.timeout ?? 15000,
      specPath: config.specPath ?? '.specstory/history',
    };
    this.validateRepository(repository);
  }

  /**
   * Validates the spec repository URL
   * @throws {TimelineAPIError} If the repository URL is invalid
   */
  private validateRepository(repoUrl: string): void {
    logger.debug('data', 'Validating spec repository URL', { repoUrl });
    if (!configUtils.isValidSpecUrl(repoUrl)) {
      logger.error('data', 'Invalid Spec repository URL', { repoUrl });
      throw new TimelineAPIError('Invalid Spec repository URL');
    }
    logger.debug('data', 'Spec repository URL is valid', { repoUrl });
  }

  /**
   * Resolves the spec directory path for the repository
   */
  private resolveSpecDirectory(repoUrl: string): string {
    logger.debug('data', 'Resolving spec directory path', { repoUrl, specPath: this.config.specPath });
    const repoPath = configUtils.resolveLocalPath(repoUrl);
    const specDir = `${repoPath}/${this.config.specPath}`;
    logger.debug('data', 'Resolved spec directory path', { specDir });
    return specDir;
  }

  /**
   * Makes a request to the API with retry logic and error handling
   */
  private async makeRequest<T>(url: string, init?: RequestInit): Promise<T> {
    // Log the full URL for debugging
    logger.info('data', 'Making API request', {
      url,
      baseUrl: this.baseUrl,
      repository: this.repository,
      method: init?.method || 'GET'
    });

    return withRetry(async () => {
      try {
        // Log the request details
        logger.debug('data', 'Sending fetch request', {
          url,
          headers: init?.headers,
          method: init?.method || 'GET'
        });

        const response = await fetch(url, init);

        // Log the response status
        logger.debug('data', 'Received API response', {
          url,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          logger.error('data', 'API request failed with error response', {
            url,
            status: response.status,
            statusText: response.statusText,
            errorData
          });

          if (response.status === 404) {
            throw new NotFoundError('Resource not found');
          }

          if (response.status >= 500) {
            throw new ServerError(
              `Server error: ${errorData.message || response.statusText}`,
              response.status
            );
          }

          throw new TimelineAPIError(
            `HTTP error: ${errorData.message || response.statusText}`,
            response.status
          );
        }

        const responseData = await response.json();
        logger.debug('data', 'API request successful', {
          url,
          dataSize: JSON.stringify(responseData).length
        });

        // Check if the response has a data property (API wrapper format)
        if (responseData && typeof responseData === 'object' && 'data' in responseData) {
          logger.debug('data', 'Extracting data from API response wrapper');
          return responseData.data as T;
        }

        return responseData;
      } catch (error) {
        logger.error('data', 'API request failed with exception', {
          url,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : String(error)
        });

        if (error instanceof TimelineAPIError) {
          throw error;
        }

        if (error instanceof TypeError) {
          throw new NetworkError('Network request failed', error);
        }

        throw new TimelineAPIError(
          `Unexpected error: ${(error as Error).message}`
        );
      }
    }, {
      ...this.config,
      shouldRetry: (error: Error): boolean => {
        // Log all errors before retry
        logger.warn(
          'data',
          'API request failed, will retry',
          { error, url }
        );

        if (error instanceof TimelineAPIError) {
          // Retry on network errors or 5xx server errors
          if (error instanceof NetworkError) {
            return true;
          }
          if (error instanceof ServerError && error.statusCode) {
            return error.statusCode >= 500;
          }
        }
        return false;
      }
    });
  }

  /**
   * Validates date parameters
   * @throws {TimelineAPIError} If the date parameters are invalid
   */
  private validateDateParams(startDate?: Date, endDate?: Date): void {
    if (startDate && isNaN(startDate.getTime())) {
      throw new TimelineAPIError('Invalid start date');
    }
    if (endDate && isNaN(endDate.getTime())) {
      throw new TimelineAPIError('Invalid end date');
    }
    if (startDate && endDate && startDate > endDate) {
      throw new TimelineAPIError('Start date must be before end date');
    }
  }

  async fetchSpecHistory(startDate?: Date, endDate?: Date): Promise<SpecTimelineEvent[]> {
    try {
      this.validateDateParams(startDate, endDate);
      const specDir = this.resolveSpecDirectory(this.repository);

      logger.debug('data', 'Starting spec history fetch', {
        repository: this.repository,
        specDir,
        startDate,
        endDate
      });

      const params = new URLSearchParams();
      if (startDate) {
        params.append('startDate', startDate.toISOString());
      }
      if (endDate) {
        params.append('endDate', endDate.toISOString());
      }

      logger.info('data', 'Fetching spec history', { repository: this.repository, startDate, endDate });

      params.append('repository', this.repository);
      const data = await this.makeRequest<SpecHistoryResponse[]>(
        `${this.baseUrl}/specs/history?${params.toString()}`
      );

      const events = this.parseSpecHistoryResponse(data);
      logger.info('data', 'Successfully fetched spec history', {
        eventCount: events.length
      });

      return events;
    } catch (error) {
      logger.error('data', 'Failed to fetch spec history', { error });
      throw error;
    }
  }

  async getSpecDetails(specId: string): Promise<SpecTimelineEvent | null> {
    try {
      if (!specId || typeof specId !== 'string') {
        throw new TimelineAPIError('Invalid spec ID');
      }

      const specDir = this.resolveSpecDirectory(this.repository);
      logger.info('data', 'Fetching spec details', {
        specId,
        repository: this.repository,
        specDir
      });

      const data = await this.makeRequest<SpecHistoryResponse>(
        `${this.baseUrl}/specs/${specId}?repository=${encodeURIComponent(this.repository)}`
      );

      const event = this.parseSpecEvent(data);
      logger.info('data', 'Successfully fetched spec details', {
        specId,
        event
      });

      return event;
    } catch (error) {
      if (error instanceof NotFoundError) {
        logger.warn('data', 'Spec not found', { specId });
        return null;
      }

      logger.error('data', 'Failed to fetch spec details', {
        specId,
        error
      });
      throw error;
    }
  }

  private parseSpecHistoryResponse(data: SpecHistoryResponse[]): SpecTimelineEvent[] {
    logger.debug('data', 'Starting to parse spec history response', {
      count: data.length,
      repository: this.repository
    });

    try {
      const events = data.map((item, index) => {
        logger.debug('data', `Parsing spec event ${index + 1}/${data.length}`, {
          specId: item.specId,
          version: item.version
        });
        return this.parseSpecEvent(item);
      });

      logger.debug('data', 'Successfully parsed spec history', {
        eventCount: events.length,
        repository: this.repository
      });

      return events;
    } catch (error) {
      logger.error('data', 'Failed to parse spec history', {
        error,
        repository: this.repository,
        dataLength: data.length
      });
      throw new TimelineAPIError('Failed to parse spec history response');
    }
  }

  private parseSpecEvent(data: SpecHistoryResponse): SpecTimelineEvent {
    try {
      // Handle both the expected format and the mock data format
      const specId = data.specId || data.id || `mock-spec-${Math.random().toString(36).substring(2, 7)}`;
      const version = data.version || '0.1.0';

      logger.debug('data', 'Validating spec event data', {
        specId,
        version
      });

      // Validate required fields
      if (!data.timestamp || !data.title) {
        const missingFields = [];
        if (!data.timestamp) missingFields.push('timestamp');
        if (!data.title) missingFields.push('title');

        logger.error('data', 'Invalid spec event data', {
          missingFields,
          data,
          repository: this.repository
        });

        throw new TimelineAPIError(
          `Invalid spec event data: Missing required fields: ${missingFields.join(', ')}`
        );
      }

      // Parse timestamp
      const timestamp = new Date(data.timestamp);
      if (isNaN(timestamp.getTime())) {
        logger.error('data', 'Invalid timestamp in spec event', {
          timestamp: data.timestamp,
          specId
        });
        throw new TimelineAPIError('Invalid timestamp format');
      }

      // Parse changes or create synthetic changes from status/tags if available
      let changes: Array<{field: string; oldValue: any; newValue: any}> = [];

      if (data.changes && Array.isArray(data.changes)) {
        changes = data.changes.map((change: SpecChangeResponse) => {
          if (!change.field) {
            logger.warn('data', 'Missing field name in spec change', {
              specId,
              change
            });
          }
          return {
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue
          };
        });
      } else if (data.status || data.tags) {
        // Create synthetic changes from status or tags for mock data
        if (data.status) {
          changes.push({
            field: 'status',
            oldValue: null,
            newValue: data.status
          });
        }

        if (data.tags && Array.isArray(data.tags)) {
          changes.push({
            field: 'tags',
            oldValue: null,
            newValue: data.tags.join(', ')
          });
        }
      }

      const event: SpecTimelineEvent = {
        id: `spec-${specId}-${version}`,
        type: 'spec',
        timestamp,
        title: data.title,
        description: data.description,
        specId: specId,
        version: version,
        changes
      };

      logger.debug('data', 'Successfully parsed spec event', {
        specId,
        version,
        changeCount: changes.length
      });

      return event;
    } catch (error) {
      if (error instanceof TimelineAPIError) {
        throw error;
      }
      logger.error('data', 'Failed to parse spec event', {
        data,
        error,
        repository: this.repository
      });
      throw new TimelineAPIError(
        `Error parsing spec event: ${(error as Error).message}`
      );
    }
  }
}