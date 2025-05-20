import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../utils/logging/logger';
import type { GitTimelineEvent } from '../types/TimelineEvent';

const execAsync = promisify(exec);

export class GitRepositoryService {
  private repoUrl: string;

  constructor(repoUrl: string) {
    this.repoUrl = repoUrl;
  }

  /**
   * Clone or update a repository and get its history
   */
  async getHistory(): Promise<GitTimelineEvent[]> {
    try {
      // Create a safe directory name from the repo URL
      const repoDir = this.repoUrl.replace(/[^a-zA-Z0-9]/g, '_');
      const workDir = `.timeline-cache/${repoDir}`;

      // Determine if URL is HTTPS or SSH
      const isHttps = this.repoUrl.startsWith('http');
      const cloneUrl = this.repoUrl;

      // Clone or update the repository
      try {
        await execAsync(`git clone ${cloneUrl} ${workDir}`);
        logger.info('git', 'Repository cloned successfully', {
          repoUrl: this.repoUrl,
          protocol: isHttps ? 'HTTPS' : 'SSH'
        });
      } catch (error: unknown) {
        // If directory exists, try to update instead
        if (error instanceof Error && error.message.includes('already exists')) {
          await execAsync(`cd ${workDir} && git fetch && git reset --hard origin/main`);
          logger.info('git', 'Repository updated successfully', { repoUrl: this.repoUrl });
        } else {
          throw error;
        }
      }

      // Get git history
      const { stdout } = await execAsync(
        `cd ${workDir} && git log --pretty=format:"%H|%aI|%an|%ae|%s" --name-status`
      );

      // Parse git log output
      const events: GitTimelineEvent[] = [];
      let currentCommit: Partial<GitTimelineEvent> | null = null;

      stdout.split('\n').forEach(line => {
        if (line.includes('|')) {
          // This is a commit line
          const [hash, timestamp, authorName, authorEmail, message] = line.split('|');
          currentCommit = {
            id: hash,
            type: 'git',
            timestamp: new Date(timestamp),
            title: message,
            commitHash: hash,
            authorName,
            authorEmail,
            branch: 'main', // We always use main branch for now
            files: []
          };
        } else if (line.trim() && currentCommit) {
          // This is a file change line
          const [status, ...pathParts] = line.trim().split('\t');
          const path = pathParts.join('\t'); // Handle paths with tabs
          if (path) {
            currentCommit.files = currentCommit.files || [];
            currentCommit.files.push({
              path,
              changeType: status === 'A' ? 'added' : status === 'M' ? 'modified' : 'deleted'
            });
          }
        } else if (!line.trim() && currentCommit) {
          // Empty line means end of commit
          events.push(currentCommit as GitTimelineEvent);
          currentCommit = null;
        }
      });

      // Don't forget the last commit if there is one
      if (currentCommit) {
        events.push(currentCommit as GitTimelineEvent);
      }

      logger.info('git', 'Git history fetched successfully', {
        repoUrl: this.repoUrl,
        commitCount: events.length
      });

      return events;
    } catch (error: unknown) {
      logger.error('git', 'Failed to get git history', {
        repoUrl: this.repoUrl,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}