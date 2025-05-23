import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../../utils/logging/Logger';
import type { GitTimelineEvent } from '../types/TimelineEvent';
import { enhanceGitCommitWithStats } from '../parsers/GitCommitParser';

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

      // Clone or update the repository with timeout
      try {
        // Create a promise that will be rejected after timeout
        const timeoutPromise = new Promise<{stdout: string, stderr: string}>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Git operation timed out after 60 seconds'));
          }, 60000); // 60 second timeout
        });

        // Race the git operation against the timeout
        await Promise.race([
          execAsync(`git clone ${cloneUrl} ${workDir}`),
          timeoutPromise
        ]);

        Logger.info(Logger.Categories.GIT, 'Repository cloned successfully', {
          repoUrl: this.repoUrl,
          protocol: isHttps ? 'HTTPS' : 'SSH'
        });
      } catch (error: unknown) {
        // If directory exists, use it without trying to update from remote
        if (error instanceof Error && error.message.includes('already exists')) {
          Logger.info(Logger.Categories.GIT, 'Using existing repository without remote fetch', { repoUrl: this.repoUrl });
        } else {
          throw error;
        }
      }

      // Get git history with timeout
      const { stdout } = await Promise.race([
        execAsync(`cd ${workDir} && git log --pretty=format:"%H|%aI|%an|%ae|%s" --name-status`),
        new Promise<{stdout: string, stderr: string}>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Git log operation timed out after 60 seconds'));
          }, 60000); // 60 second timeout
        })
      ]);

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

      // Enhance commits with statistics
      const enhancedEvents = events.map(event => enhanceGitCommitWithStats(event));

      Logger.info(Logger.Categories.GIT, 'Git history fetched successfully', {
        repoUrl: this.repoUrl,
        commitCount: enhancedEvents.length
      });

      return enhancedEvents;
    } catch (error: unknown) {
      Logger.error(Logger.Categories.GIT, 'Failed to get git history', {
        repoUrl: this.repoUrl,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}