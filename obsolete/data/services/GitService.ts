import type { GitTimelineEvent } from '../types/TimelineEvent';
import { configUtils } from '../../config/config';
import { logger } from '../../utils/logging/logger';
import { withRetry } from '../../utils/api/retry';
import { TimelineAPIError, ServerError, NotFoundError, NetworkError } from '../../utils/api/errors';

interface GitCommitResponse {
  hash: string;
  timestamp: string;
  author: {
    name: string;
    email: string;
  };
  message: string;
  branch: string;
  files: Array<{
    path: string;
    status: 'A' | 'M' | 'D';  // Added, Modified, Deleted
  }>;
}

export interface GitServiceConfig {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  timeout?: number;
}

export class GitService {
  private baseUrl: string;
  private config: Required<GitServiceConfig>;
  private repository: string;

  /**
   * Validates the git repository URL statically
   * @throws {TimelineAPIError} If the repository URL is invalid
   */
  static validateRepository(repoUrl: string): void {
    try {
      // First check if the URL is empty
      if (!repoUrl || repoUrl.trim() === '') {
        logger.error('data', 'Empty Git repository URL');
        throw new TimelineAPIError('Please enter a Git repository URL');
      }

      // Then validate the URL format
      if (!configUtils.isValidGitUrl(repoUrl)) {
        logger.error('data', 'Invalid Git repository URL format', { repoUrl });
        throw new TimelineAPIError('Invalid Git repository URL format. Please check the URL and try again.');
      }

      logger.debug('data', 'Valid Git repository URL', { repoUrl });
    } catch (error: unknown) {
      logger.error('data', 'URL validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Rethrow the error with a more user-friendly message if it's not already a TimelineAPIError
      if (error instanceof TimelineAPIError) {
        throw error;
      } else {
        throw new TimelineAPIError('Could not validate the repository URL. Please check your connection and try again.');
      }
    }
  }

  constructor(
    baseUrl: string,
    repository: string,
    config: GitServiceConfig = {}
  ) {
    this.baseUrl = baseUrl;
    this.repository = repository;
    this.config = {
      maxAttempts: config.maxAttempts ?? 3,
      initialDelay: config.initialDelay ?? 1000,
      maxDelay: config.maxDelay ?? 10000,
      timeout: config.timeout ?? 15000,
    };
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

  async fetchGitHistory(startDate?: Date, endDate?: Date): Promise<GitTimelineEvent[]> {
    try {
      this.validateDateParams(startDate, endDate);

      const params = new URLSearchParams();
      if (startDate) {
        params.append('startDate', startDate.toISOString());
      }
      if (endDate) {
        params.append('endDate', endDate.toISOString());
      }

      logger.info('data', 'Fetching git history', { repository: this.repository, startDate, endDate });

      params.append('repository', this.repository);
      const data = await this.makeRequest<GitCommitResponse[]>(
        `${this.baseUrl}/git/history?${params.toString()}`
      );

      const events = this.parseGitHistory(data);
      logger.info('data', 'Successfully fetched git history', {
        eventCount: events.length
      });

      return events;
    } catch (error) {
      logger.error('data', 'Failed to fetch git history', { error });
      throw error;
    }
  }

  async getCommitDetails(commitHash: string): Promise<GitTimelineEvent | null> {
    try {
      if (!commitHash || typeof commitHash !== 'string') {
        throw new TimelineAPIError('Invalid commit hash');
      }

      logger.info('data', 'Fetching commit details', { commitHash });

      const params = new URLSearchParams();
      params.append('repository', this.repository);
      const data = await this.makeRequest<GitCommitResponse>(
        `${this.baseUrl}/git/commits/${commitHash}?${params.toString()}`
      );

      const event = this.parseGitCommit(data);
      logger.info('data', 'Successfully fetched commit details', {
        commitHash,
        event
      });

      return event;
    } catch (error) {
      if (error instanceof NotFoundError) {
        logger.warn('data', 'Commit not found', { commitHash });
        return null;
      }

      logger.error('data', 'Failed to fetch commit details', {
        commitHash,
        error
      });
      throw error;
    }
  }

  private parseGitHistory(commits: GitCommitResponse[]): GitTimelineEvent[] {
    return commits.map(commit => this.parseGitCommit(commit));
  }

  private parseGitCommit(commit: GitCommitResponse): GitTimelineEvent {
    return {
      id: `git-${commit.hash}`,
      type: 'git',
      timestamp: new Date(commit.timestamp),
      title: commit.message.split('\n')[0], // First line as title
      description: commit.message.split('\n').slice(1).join('\n').trim() || undefined,
      commitHash: commit.hash,
      authorName: commit.author.name,
      authorEmail: commit.author.email,
      branch: commit.branch,
      files: commit.files.map(file => ({
        path: file.path,
        changeType: this.mapGitStatus(file.status),
      })),
    };
  }

  private mapGitStatus(status: 'A' | 'M' | 'D'): 'added' | 'modified' | 'deleted' {
    const statusMap: Record<'A' | 'M' | 'D', 'added' | 'modified' | 'deleted'> = {
      'A': 'added',
      'M': 'modified',
      'D': 'deleted'
    };
    return statusMap[status];
  }
}