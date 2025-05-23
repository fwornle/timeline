import type { GitTimelineEvent } from '../types/TimelineEvent';
import { Logger } from '../../utils/logging/Logger';
import { TimelineAPIError, ServerError, NotFoundError, NetworkError } from '../../utils/api/errors';

interface GitCommitResponse {
  id: string;
  type: 'git';
  timestamp: string;
  title: string;
  authorName: string;
  authorEmail: string;
  branch: string;
  commitHash: string;
  files: Array<{ path: string; type: 'modified' | 'added' | 'deleted' }>;
  stats?: {
    filesCreated?: number;
    filesModified?: number;
    filesDeleted?: number;
    totalFilesChanged?: number;
    linesAdded?: number;
    linesDeleted?: number;
    linesDelta?: number;
  };
}

interface GitHistoryResponse {
  success: boolean;
  data: GitCommitResponse[];
  timestamp: string;
  mocked: boolean;
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
    Logger.info(Logger.Categories.DATA, 'Making API request', {
      url,
      baseUrl: this.baseUrl,
      repository: this.repository,
      method: init?.method || 'GET'
    });

    try {
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

        const data = await response.json();
        // Return the full response data to access the cached flag
        return data as T;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new TimelineAPIError(`Request timeout after ${this.config.timeout}ms`);
        }
        throw error;
      }
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
      // Debug: Log the incoming data
      Logger.debug(Logger.Categories.DATA, 'parseGitCommit input data', { id: data.id, incomingStats: data.stats });

      // Initialize stats - use server stats if available, otherwise calculate
      let stats: {
        filesAdded: number;
        filesModified: number;
        filesDeleted: number;
        linesAdded: number;
        linesDeleted: number;
        linesDelta: number;
      };

      if (data.stats) {
        // Use server-provided stats
        Logger.debug(Logger.Categories.DATA, 'Using server-provided stats for commit', { id: data.id });
        stats = {
          filesAdded: data.stats.filesCreated || 0,
          filesModified: data.stats.filesModified || 0,
          filesDeleted: data.stats.filesDeleted || 0,
          linesAdded: data.stats.linesAdded || 0,
          linesDeleted: data.stats.linesDeleted || 0,
          linesDelta: data.stats.linesDelta || 0
        };
      } else {
        // Calculate stats from files
        Logger.debug(Logger.Categories.DATA, 'Calculating stats for commit', { id: data.id });
        stats = {
          filesAdded: 0,
          filesModified: 0,
          filesDeleted: 0,
          linesAdded: 0,
          linesDeleted: 0,
          linesDelta: 0
        };

        // Count files by change type
        if (data.files && Array.isArray(data.files)) {
          data.files.forEach(file => {
            switch (file.type) {
              case 'added':
                stats.filesAdded++;
                stats.linesAdded += 50; // Estimate 50 lines per added file
                break;
              case 'modified':
                stats.filesModified++;
                stats.linesAdded += 20; // Estimate 20 lines added per modified file
                stats.linesDeleted += 10; // Estimate 10 lines deleted per modified file
                break;
              case 'deleted':
                stats.filesDeleted++;
                stats.linesDeleted += 50; // Estimate 50 lines per deleted file
                break;
            }
          });
        }

        // Calculate line delta
        stats.linesDelta = stats.linesAdded - stats.linesDeleted;
      }

      // Debug: Log the final stats
      Logger.debug(Logger.Categories.DATA, 'Final stats for commit', { id: data.id, stats });

      const event: GitTimelineEvent = {
        id: data.id,
        type: 'git',
        timestamp: new Date(data.timestamp),
        title: data.title,
        description: '', // No description in the data
        commitHash: data.commitHash,
        authorName: data.authorName,
        authorEmail: data.authorEmail,
        branch: data.branch,
        files: data.files.map(file => ({
          path: file.path,
          changeType: file.type
        })),
        stats: stats
      };

      return event;
    } catch (error) {
      Logger.error(Logger.Categories.DATA, 'Failed to parse git commit', {
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
   * Fetches git history from the API
   */
  async fetchGitHistory(startDate?: Date, endDate?: Date): Promise<{ events: GitTimelineEvent[], mocked: boolean }> {
    try {
      this.validateDateParams(startDate, endDate);

      const params = new URLSearchParams();
      if (startDate) {
        params.append('startDate', startDate.toISOString());
      }
      if (endDate) {
        params.append('endDate', endDate.toISOString());
      }

      Logger.info(Logger.Categories.DATA, 'Fetching git history', { repository: this.repository, startDate, endDate });

      params.append('repository', this.repository);
      const response = await this.makeRequest<GitHistoryResponse>(
        `${this.baseUrl}/git/history?${params.toString()}`
      );

      // Debug: Log the raw response data
      Logger.debug(Logger.Categories.API, 'Raw git history response', { response });

      const events = response.data.map(commit => {
        // Debug: Log each raw commit before parsing
        Logger.debug(Logger.Categories.DATA, 'Raw git commit', { id: commit.id, stats: commit.stats });
        const parsedCommit = this.parseGitCommit(commit);
        // Debug: Log each parsed commit
        Logger.debug(Logger.Categories.DATA, 'Parsed git commit', { id: parsedCommit.id, stats: parsedCommit.stats });
        return parsedCommit;
      });

      const mocked = response.mocked || false;

      Logger.info(Logger.Categories.DATA, 'Successfully fetched git history', {
        eventCount: events.length,
        mocked
      });

      return { events, mocked };
    } catch (error) {
      Logger.error(Logger.Categories.DATA, 'Failed to fetch git history', {
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

      Logger.info(Logger.Categories.DATA, 'Fetching commit details', { commitHash });

      const params = new URLSearchParams();
      params.append('repository', this.repository);
      const data = await this.makeRequest<GitCommitResponse>(
        `${this.baseUrl}/git/commits/${commitHash}?${params.toString()}`
      );

      const event = this.parseGitCommit(data);
      Logger.info(Logger.Categories.DATA, 'Successfully fetched commit details', {
        commitHash,
        event
      });

      return event;
    } catch (error) {
      if (error instanceof NotFoundError) {
        Logger.warn(Logger.Categories.DATA, 'Commit not found', { commitHash });
        return null;
      }
      Logger.error(Logger.Categories.DATA, 'Failed to fetch commit details', {
        error,
        commitHash,
        repository: this.repository
      });
      throw error;
    }
  }
}
