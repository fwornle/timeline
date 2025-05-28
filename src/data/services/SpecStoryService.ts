import type { SpecTimelineEvent } from '../types/TimelineEvent';
import { Logger } from '../../utils/logging/Logger';
import { TimelineAPIError, ServerError, NotFoundError, NetworkError } from '../../utils/api/errors';

interface SpecHistoryResponse {
  id: string;
  timestamp: string;
  author: string;
  title: string;
  description: string;
  status?: string;
  version: string;
  tags?: string[] | string;
  changes?: Array<{
    field: string;
    oldValue: string | null;
    newValue: string;
  }>;
  type?: 'spec';
  stats?: {
    promptCount: number;
    filesCreated: number;
    filesModified: number;
    linesAdded: number;
    linesDeleted: number;
    linesDelta: number;
    toolInvocations: number;
  };
}

interface SpecAPIResponse {
  success: boolean;
  data: SpecHistoryResponse[];
  timestamp: string;
  mocked: boolean;
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

  // Removed unused validateRepository method

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
        // Return the full response data to access the cached/mocked flags
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
   * Parses a spec history response into a SpecTimelineEvent
   */
  private parseSpecEvent(data: SpecHistoryResponse): SpecTimelineEvent {
    try {
      const specId = data.id;
      const version = data.version;
      const timestamp = new Date(data.timestamp);

      // Use existing changes if provided, otherwise generate them
      const changes = data.changes || [];

      if (changes.length === 0) {
        // Generate changes based on the data
        if (data.status) {
          changes.push({
            field: 'status',
            oldValue: 'draft',
            newValue: data.status
          });
        }

        if (data.tags) {
          changes.push({
            field: 'tags',
            oldValue: null,
            newValue: Array.isArray(data.tags) ? data.tags.join(', ') : data.tags
          });
        }

        // If still no changes were detected, add a default change
        if (changes.length === 0) {
          changes.push({
            field: 'content',
            oldValue: null,
            newValue: data.description || 'No description available'
          });
        }
      }

      // Check if stats are provided in the data
      let stats;

      if (data.stats) {
        // Use server-provided stats
        Logger.debug(Logger.Categories.DATA, 'Using server-provided stats for spec', { id: data.id, stats: data.stats });
        stats = {
          promptCount: data.stats.promptCount || 0,
          filesCreated: data.stats.filesCreated || 0,
          filesModified: data.stats.filesModified || 0,
          linesAdded: data.stats.linesAdded || 0,
          linesDeleted: data.stats.linesDeleted || 0,
          linesDelta: data.stats.linesDelta || 0,
          toolInvocations: data.stats.toolInvocations || 0
        };
      } else {
        // Generate statistics based on the description content
        Logger.debug(Logger.Categories.DATA, 'Generating stats for spec', { id: data.id });
        stats = {
          promptCount: 0,
          filesCreated: 0,
          filesModified: 0,
          linesAdded: 0,
          linesDeleted: 0,
          linesDelta: 0,
          toolInvocations: 0
        };

        // Count prompts based on description content
        if (data.description) {
          // Count prompts (look for human/assistant exchanges)
          const humanPromptMatches = data.description.match(/Human:|User:/gi);
          if (humanPromptMatches) {
            stats.promptCount = humanPromptMatches.length;
          }

          // Count code blocks as files created
          const codeBlockMatches = data.description.match(/```[a-z]*/gi);
          if (codeBlockMatches) {
            stats.filesCreated = Math.floor(codeBlockMatches.length / 2); // Each file has opening and closing ```
          }

          // Estimate lines added based on description length
          stats.linesAdded = Math.floor(data.description.length / 80); // Rough estimate: 1 line per 80 chars

          // Estimate tool invocations
          const toolMatches = data.description.match(/tool|function|command|invoke/gi);
          if (toolMatches) {
            stats.toolInvocations = toolMatches.length;
          }
        }

        // Calculate line delta
        stats.linesDelta = stats.linesAdded - stats.linesDeleted;
      }

      // Debug: Log the final stats
      Logger.debug(Logger.Categories.DATA, 'Final stats for spec', { id: data.id, stats });

      const event: SpecTimelineEvent = {
        id: `spec-${specId}-${version}`,
        type: 'spec',
        timestamp,
        title: data.title,
        description: data.description,
        specId: specId,
        version: version,
        changes,
        stats
      };

      Logger.debug(Logger.Categories.DATA, 'Successfully parsed spec event', {
        specId,
        version,
        changeCount: changes.length,
        stats
      });

      return event;
    } catch (error) {
      if (error instanceof TimelineAPIError) {
        throw error;
      }
      Logger.error(Logger.Categories.DATA, 'Failed to parse spec event', {
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
  async fetchSpecHistory(startDate?: Date, endDate?: Date): Promise<{ events: SpecTimelineEvent[], mocked: boolean }> {
    try {
      this.validateDateParams(startDate, endDate);
      const specDir = this.resolveSpecDirectory(this.repository);

      Logger.debug(Logger.Categories.DATA, 'Starting spec history fetch', {
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

      Logger.info(Logger.Categories.DATA, 'Fetching spec history', { repository: this.repository, startDate, endDate });

      params.append('repository', this.repository);
      const response = await this.makeRequest<SpecAPIResponse>(
        `${this.baseUrl}/specs/history?${params.toString()}`
      );

      // Debug: Log the raw response data
      Logger.debug(Logger.Categories.API, 'Raw spec history response', { response });

      const events = response.data.map((spec: SpecHistoryResponse) => {
        // Debug: Log each raw spec before parsing
        Logger.debug(Logger.Categories.DATA, 'Raw spec event', { id: spec.id, stats: spec.stats });
        const parsedSpec = this.parseSpecEvent(spec);
        // Debug: Log each parsed spec
        Logger.debug(Logger.Categories.DATA, 'Parsed spec event', { id: parsedSpec.id, stats: parsedSpec.stats });
        return parsedSpec;
      });

      const mocked = response.mocked || false;

      Logger.info(Logger.Categories.DATA, 'Successfully fetched spec history', {
        eventCount: events.length,
        mocked
      });

      return { events, mocked };
    } catch (error) {
      Logger.error(Logger.Categories.DATA, 'Failed to fetch spec history', {
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
      Logger.info(Logger.Categories.DATA, 'Fetching spec details', {
        specId,
        repository: this.repository,
        specDir
      });

      const data = await this.makeRequest<SpecHistoryResponse>(
        `${this.baseUrl}/specs/${specId}?repository=${encodeURIComponent(this.repository)}`
      );

      const event = this.parseSpecEvent(data);
      Logger.info(Logger.Categories.DATA, 'Successfully fetched spec details', {
        specId,
        event
      });

      return event;
    } catch (error) {
      if (error instanceof NotFoundError) {
        Logger.warn(Logger.Categories.DATA, 'Spec not found', { specId });
        return null;
      }
      Logger.error(Logger.Categories.DATA, 'Failed to fetch spec details', {
        error,
        specId,
        repository: this.repository
      });
      throw error;
    }
  }

  /**
   * Purges cached data for the repository
   */
  async purgeCache(hard: boolean = false): Promise<void> {
    try {
      Logger.info(Logger.Categories.DATA, 'Purging spec cache', { repository: this.repository, hard });
      
      const params = new URLSearchParams();
      params.append('repository', this.repository);
      
      const endpoint = hard ? `${this.baseUrl}/purge/hard?${params.toString()}` : `${this.baseUrl}/purge?${params.toString()}`;
      
      await this.makeRequest<{ success: boolean; message: string }>(endpoint, {
        method: 'POST'
      });
      
      Logger.info(Logger.Categories.DATA, 'Successfully purged spec cache', { repository: this.repository, hard });
    } catch (error) {
      Logger.error(Logger.Categories.DATA, 'Failed to purge spec cache', {
        error,
        repository: this.repository,
        hard
      });
      throw error;
    }
  }
}
