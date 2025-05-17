import type { SpecTimelineEvent } from '../types/TimelineEvent';
import { logger } from '../../utils/logging/logger';
import { withRetry } from '../../utils/api/retry';
import { TimelineAPIError, ServerError, NotFoundError, NetworkError } from '../../utils/api/errors';

interface SpecHistoryResponse {
  id: string;
  timestamp: string;
  author: string;
  title: string;
  description: string;
  status: string;
  version: string;
  tags: string[];
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
  }

  /**
   * Validates the repository URL
   */
  private validateRepository(repository: string): void {
    if (!repository || repository.trim() === '') {
      logger.error('data', 'Empty repository URL');
      throw new TimelineAPIError('Please enter a repository URL');
    }
  }

  /**
   * Resolves the spec directory from the repository URL
   */
  private resolveSpecDirectory(repository: string): string {
    // In a real implementation, this would extract the repository path
    // For now, we'll just return the repository URL
    return repository;
  }

  /**
   * Validates date parameters
   */
  private validateDateParams(startDate?: Date, endDate?: Date): void {
    if (startDate && endDate && startDate > endDate) {
      throw new TimelineAPIError('Start date must be before end date');
    }
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

    try {
      const response = await withRetry(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

          try {
            const response = await fetch(url, {
              ...init,
              signal: controller.signal,
              headers: {
                'Content-Type': 'application/json',
                ...(init?.headers || {})
              }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              if (response.status === 404) {
                throw new NotFoundError(`Resource not found: ${url}`);
              } else if (response.status >= 500) {
                throw new ServerError(`Server error: ${response.status}`);
              } else {
                const errorData = await response.json().catch(() => ({}));
                throw new TimelineAPIError(
                  errorData.error?.message || `API error: ${response.status}`
                );
              }
            }

            return response;
          } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
              throw new TimelineAPIError(`Request timeout after ${this.config.timeout}ms`);
            }
            throw error;
          }
        },
        this.config
      );

      const data = await response.json();
      return data.data as T;
    } catch (error) {
      if (error instanceof TimelineAPIError) {
        throw error;
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError('Network error: Unable to connect to the server');
      } else {
        throw new TimelineAPIError(
          `Unexpected error: ${(error as Error).message}`
        );
      }
    }
  }

  /**
   * Parses a spec history response into a SpecTimelineEvent
   */
  private parseSpecEvent(data: SpecHistoryResponse): SpecTimelineEvent {
    try {
      const specId = data.id;
      const version = data.version;
      const timestamp = new Date(data.timestamp);

      // Generate some mock changes based on the version
      const changes = [
        {
          field: 'status',
          oldValue: 'draft',
          newValue: data.status
        },
        {
          field: 'tags',
          oldValue: null,
          newValue: data.tags.join(', ')
        }
      ];

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

  /**
   * Fetches spec history from the API
   */
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

      const events = data.map(spec => this.parseSpecEvent(spec));
      logger.info('data', 'Successfully fetched spec history', {
        eventCount: events.length
      });

      return events;
    } catch (error) {
      logger.error('data', 'Failed to fetch spec history', {
        error,
        repository: this.repository
      });
      throw error;
    }
  }

  /**
   * Fetches details for a specific spec
   */
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
        error,
        specId,
        repository: this.repository
      });
      throw error;
    }
  }
}
