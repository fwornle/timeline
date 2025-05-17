import type { GitTimelineEvent } from '../types/TimelineEvent';
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
      // Return the full response data to access the cached flag
      return data;
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
   * Validates date parameters
   */
  private validateDateParams(startDate?: Date, endDate?: Date): void {
    if (startDate && endDate && startDate > endDate) {
      throw new TimelineAPIError('Start date must be before end date');
    }
  }

  /**
   * Parses a git commit response into a GitTimelineEvent
   */
  private parseGitCommit(data: GitCommitResponse): GitTimelineEvent {
    try {
      const event: GitTimelineEvent = {
        id: `git-${data.hash}`,
        type: 'git',
        timestamp: new Date(data.timestamp),
        title: data.message.split('\n')[0],
        description: data.message.split('\n').slice(1).join('\n').trim(),
        commitHash: data.hash,
        authorName: data.author.name,
        authorEmail: data.author.email,
        branch: data.branch,
        files: data.files.map(file => ({
          path: file.path,
          changeType: file.status === 'A' ? 'added' : file.status === 'M' ? 'modified' : 'deleted'
        }))
      };

      return event;
    } catch (error) {
      logger.error('data', 'Failed to parse git commit', {
        data,
        error,
        repository: this.repository
      });
      throw new TimelineAPIError(
        `Error parsing git commit: ${(error as Error).message}`
      );
    }
  }

  /**
   * Parses an array of git commit responses into GitTimelineEvents
   */
  private parseGitHistory(data: GitCommitResponse[]): GitTimelineEvent[] {
    return data.map(commit => this.parseGitCommit(commit));
  }

  /**
   * Fetches git history from the API
   */
  async fetchGitHistory(startDate?: Date, endDate?: Date): Promise<{ events: GitTimelineEvent[], cached: boolean }> {
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
      const response = await this.makeRequest<any>(
        `${this.baseUrl}/git/history?${params.toString()}`
      );

      const events = this.parseGitHistory(response.data);
      // Use mocked flag if available, otherwise fall back to cached
      const cached = response.mocked || response.cached || false;

      logger.info('data', 'Successfully fetched git history', {
        eventCount: events.length,
        cached,
        mocked: response.mocked
      });

      return { events, cached };
    } catch (error) {
      logger.error('data', 'Failed to fetch git history', {
        error,
        repository: this.repository
      });
      throw error;
    }
  }

  /**
   * Fetches details for a specific commit
   */
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
        error,
        commitHash,
        repository: this.repository
      });
      throw error;
    }
  }
}
