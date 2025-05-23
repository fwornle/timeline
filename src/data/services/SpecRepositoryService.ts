import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { Logger } from '../../utils/logging/Logger';
import type { SpecTimelineEvent } from '../types/TimelineEvent';
import { parseSpecHistoryStats } from '../parsers/SpecHistoryParser';

export class SpecRepositoryService {
  constructor(private repoUrl: string) {}

  /**
   * Get spec history from .specstory/history/*.md files
   */
  async getHistory(): Promise<SpecTimelineEvent[]> {
    try {
      // Create a safe directory name from the repo URL
      const repoDir = this.repoUrl.replace(/[^a-zA-Z0-9]/g, '_');
      const workDir = `.timeline-cache/${repoDir}`;
      const specDir = join(workDir, '.specstory/history');

      // Read all .md files from the spec directory
      const events: SpecTimelineEvent[] = [];
      try {
        const files = await readdir(specDir);
        const mdFiles = files.filter(f => f.endsWith('.md'));

        for (const file of mdFiles) {
          const content = await readFile(join(specDir, file), 'utf-8');
          const event = this.parseSpecFile(file, content);
          if (event) {
            events.push(event);
          }
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('ENOENT')) {
          Logger.warn(Logger.Categories.SPEC, 'No spec history directory found', {
            repoUrl: this.repoUrl,
            specDir
          });
          return [];
        }
        throw error;
      }

      Logger.info(Logger.Categories.SPEC, 'Spec history fetched successfully', {
        repoUrl: this.repoUrl,
        specCount: events.length
      });

      return events;
    } catch (error: unknown) {
      Logger.error(Logger.Categories.SPEC, 'Failed to get spec history', {
        repoUrl: this.repoUrl,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Parse a spec file into a timeline event
   */
  private parseSpecFile(filename: string, content: string): SpecTimelineEvent | null {
    try {
      // Expected filename format: YYYY-MM-DD-title.md
      const match = filename.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
      if (!match) {
        Logger.warn(Logger.Categories.SPEC, 'Invalid spec filename format', { filename });
        return null;
      }

      const [, dateStr, titleSlug] = match;
      const timestamp = new Date(dateStr);

      // Parse frontmatter and content
      const lines = content.split('\n');
      const frontmatter: Record<string, string> = {};
      let inFrontmatter = false;
      let contentStart = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '---') {
          if (!inFrontmatter) {
            inFrontmatter = true;
            continue;
          } else {
            contentStart = i + 1;
            break;
          }
        }
        if (inFrontmatter && line) {
          const [key, ...valueParts] = line.split(':');
          if (key) {
            frontmatter[key.trim()] = valueParts.join(':').trim();
          }
        }
      }

      const description = lines.slice(contentStart).join('\n').trim();
      const title = frontmatter.title || titleSlug.replace(/-/g, ' ');
      const version = frontmatter.version || '1.0.0';
      const specId = `${dateStr}-${titleSlug}`;

      // Parse changes if available
      const changes = [];
      if (frontmatter.changes) {
        try {
          const changesList = JSON.parse(frontmatter.changes);
          changes.push(...changesList);
        } catch {
          // If changes can't be parsed, create a single change from the description
          changes.push({
            field: 'content',
            oldValue: null,
            newValue: description
          });
        }
      } else {
        changes.push({
          field: 'content',
          oldValue: null,
          newValue: description
        });
      }

      // Parse statistics from the content
      const stats = parseSpecHistoryStats(content);

      return {
        id: specId,
        type: 'spec',
        timestamp,
        title,
        description,
        specId,
        version,
        changes,
        stats
      };
    } catch (error: unknown) {
      Logger.error(Logger.Categories.SPEC, 'Failed to parse spec file', {
        filename,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }
}