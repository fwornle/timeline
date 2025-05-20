const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const { parseGitCommitStats, getCommitDiffStats } = require('../parsers/GitHistoryParser.cjs');
const { parseSpecHistoryStats } = require('../parsers/SpecHistoryParser.cjs');

const execAsync = promisify(exec);

// Helper for local time logging
function localTime() {
  return new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
}

class GitRepositoryService {
  constructor(repoUrl) {
    this.repoUrl = repoUrl;
  }

  async getHistory() {
    try {
      console.log(`[${localTime()}] [GIT] Attempting to fetch git history for ${this.repoUrl}`);

      // Create a safe directory name from the repo URL
      const repoDir = this.repoUrl.replace(/[^a-zA-Z0-9]/g, '_');
      const workDir = `.timeline-cache/${repoDir}`;

      // Determine if URL is HTTPS or SSH and use the appropriate protocol
      const isHttps = this.repoUrl.startsWith('http');
      const cloneUrl = this.repoUrl; // Use the original URL as provided

      // Clone or update the repository with timeout
      try {
        console.log(`[${localTime()}] [GIT] Attempting to clone with ${isHttps ? 'HTTPS' : 'SSH'}: ${cloneUrl}`);

        // Create a promise that will be rejected after timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Git operation timed out after 60 seconds'));
          }, 60000); // 60 second timeout
        });

        // Race the git operation against the timeout
        await Promise.race([
          execAsync(`git clone ${cloneUrl} ${workDir}`),
          timeoutPromise
        ]);

        console.log(`[${localTime()}] [GIT] Repository cloned successfully with ${isHttps ? 'HTTPS' : 'SSH'}`);
      } catch (cloneError) {
        // If directory exists, use it without trying to update from remote
        if (fs.existsSync(workDir)) {
          console.log(`[${localTime()}] [GIT] Using existing repository at ${workDir}`);
          // Skip the remote fetch and just use the local clone
          console.log(`[${localTime()}] [GIT] Using local clone without remote fetch`);
        } else {
          console.error(`[${localTime()}] [GIT] Clone attempt failed and no local repository exists:`);
          console.error(`[${localTime()}] [GIT] Error:`, cloneError.message);
          throw new Error(`Failed to clone repository using ${isHttps ? 'HTTPS' : 'SSH'}`);
        }
      }

      // Get git history with timeout
      console.log(`[${localTime()}] [GIT] Fetching git log`);
      const { stdout } = await Promise.race([
        execAsync(`cd ${workDir} && git log --pretty=format:"%H|%aI|%an|%ae|%s" --name-status`),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Git log operation timed out after 60 seconds'));
          }, 60000); // 60 second timeout
        })
      ]);

      // Parse git log output
      const events = [];
      let currentCommit = null;

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
            branch: 'main',
            files: [],
            stats: {
              filesCreated: 0,
              filesModified: 0,
              filesDeleted: 0,
              totalFilesChanged: 0,
              linesAdded: 0,
              linesDeleted: 0,
              linesDelta: 0
            }
          };
        } else if (line.trim() && currentCommit) {
          // This is a file change line
          const [status, ...pathParts] = line.trim().split('\t');
          const path = pathParts.join('\t');
          if (path) {
            currentCommit.files = currentCommit.files || [];
            const changeType = status === 'A' ? 'added' : status === 'M' ? 'modified' : 'deleted';
            currentCommit.files.push({
              path,
              changeType
            });

            // Update stats based on file change type
            currentCommit.stats.totalFilesChanged++;
            if (changeType === 'added') {
              currentCommit.stats.filesCreated++;
            } else if (changeType === 'modified') {
              currentCommit.stats.filesModified++;
            } else if (changeType === 'deleted') {
              currentCommit.stats.filesDeleted++;
            }
          }
        } else if (!line.trim() && currentCommit) {
          // Empty line means end of commit
          // Calculate line stats based on file changes
          currentCommit.stats.linesAdded = (currentCommit.stats.filesCreated * 50) + (currentCommit.stats.filesModified * 20);
          currentCommit.stats.linesDeleted = (currentCommit.stats.filesDeleted * 50) + (currentCommit.stats.filesModified * 10);
          currentCommit.stats.linesDelta = currentCommit.stats.linesAdded - currentCommit.stats.linesDeleted;

          events.push(currentCommit);
          currentCommit = null;
        }
      });

      // Don't forget the last commit
      if (currentCommit) {
        // Calculate line stats for the last commit if needed
        if (currentCommit.files.length > 0 && currentCommit.stats.linesDelta === 0) {
          currentCommit.stats.linesAdded = (currentCommit.stats.filesCreated * 50) + (currentCommit.stats.filesModified * 20);
          currentCommit.stats.linesDeleted = (currentCommit.stats.filesDeleted * 50) + (currentCommit.stats.filesModified * 10);
          currentCommit.stats.linesDelta = currentCommit.stats.linesAdded - currentCommit.stats.linesDeleted;
        }
        events.push(currentCommit);
      }

      console.log(`[${localTime()}] [GIT] Successfully parsed ${events.length} commits`);
      return events;
    } catch (error) {
      console.error(`[${localTime()}] [GIT] Failed to get git history:`, error);
      throw error;
    }
  }
}

class SpecRepositoryService {
  constructor(repoUrl) {
    this.repoUrl = repoUrl;
  }

  async getHistory() {
    try {
      console.log(`[${localTime()}] [SPEC] Attempting to fetch spec history for ${this.repoUrl}`);

      // Create a safe directory name from the repo URL
      const repoDir = this.repoUrl.replace(/[^a-zA-Z0-9]/g, '_');
      const workDir = `.timeline-cache/${repoDir}`;
      const specDir = path.join(workDir, '.specstory/history');

      console.log(`[${localTime()}] [SPEC] Looking for specs in ${specDir}`);

      // Read all .md files from the spec directory
      const events = [];
      try {
        const files = await fs.promises.readdir(specDir);
        const mdFiles = files.filter(f => f.endsWith('.md'));

        console.log(`[${localTime()}] [SPEC] Found ${mdFiles.length} spec files`);

        for (const file of mdFiles) {
          const content = await fs.promises.readFile(path.join(specDir, file), 'utf-8');
          const event = this.parseSpecFile(file, content);
          if (event) {
            events.push(event);
          }
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log(`[${localTime()}] [SPEC] No spec history directory found at ${specDir}`);
          return [];
        }
        throw error;
      }

      console.log(`[${localTime()}] [SPEC] Successfully parsed ${events.length} specs`);
      return events;
    } catch (error) {
      console.error(`[${localTime()}] [SPEC] Failed to get spec history:`, error);
      throw error;
    }
  }

  parseSpecFile(filename, content) {
    try {
      // Expected filename format: YYYY-MM-DD_HH-mm-title.md
      const match = filename.match(/^(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2})-(.+)\.md$/);
      if (!match) {
        console.warn(`[${localTime()}] [SPEC] Invalid spec filename format: ${filename}`);
        return null;
      }

      const [, dateStr, timeStr, titleSlug] = match;
      // Convert date and time to ISO format for parsing
      const timestamp = new Date(`${dateStr}T${timeStr.replace('-', ':')}`);

      // Parse frontmatter only - we don't need the content
      const lines = content.split('\n');
      const frontmatter = {};
      let inFrontmatter = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '---') {
          if (!inFrontmatter) {
            inFrontmatter = true;
            continue;
          } else {
            // End of frontmatter
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

      // We don't need the full description anymore, just extract the title and metadata
      const title = frontmatter.title || titleSlug.replace(/-/g, ' ');
      const version = frontmatter.version || '1.0.0';
      const specId = `${dateStr}-${timeStr}-${titleSlug}`;

      // Extract type from title or use default
      const typeMatch = titleSlug.match(/(system|api|ui|database|architecture|security|refactoring|documentation)/i);
      const type = typeMatch ? typeMatch[1].toLowerCase() : 'general';

      // Extract status from title or use default
      const statusMatch = titleSlug.match(/(draft|review|approved|implemented|deprecated)/i);
      const status = statusMatch ? statusMatch[1].toLowerCase() : 'draft';

      // Parse statistics from content
      // Count prompts, estimate file changes and line changes
      const stats = this.parseSpecStats(content);

      return {
        id: specId,
        type: 'spec',
        timestamp,
        title,
        description: '', // Don't include the full description, just stats
        specId,
        version,
        status: frontmatter.status || status,
        tags: [
          type,
          frontmatter.status || status,
          `v${version}`
        ],
        stats: stats
      };
    } catch (error) {
      console.error(`[${localTime()}] [SPEC] Failed to parse spec file ${filename}:`, error);
      return null;
    }
  }

  parseSpecStats(content) {
    // Initialize stats
    const stats = {
      promptCount: 0,
      filesCreated: 0,
      filesModified: 0,
      linesAdded: 0,
      linesDeleted: 0,
      linesDelta: 0,
      toolInvocations: 0
    };

    // Split content into lines
    const lines = content.split('\n');

    // Find all prompts (lines starting with _**User**_ or **User**)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('_**User**_') || line.startsWith('**User**')) {
        stats.promptCount++;
      }

      // Look for code blocks which might indicate file creation
      if (line.startsWith('```') && !line.startsWith('```diff') && !line.startsWith('```bash') && !line.startsWith('```shell')) {
        stats.filesCreated++;
      }

      // Look for diff blocks which might indicate file modification
      if (line.startsWith('```diff')) {
        stats.filesModified++;
      }

      // Look for tool invocations
      if (line.startsWith('```bash') || line.startsWith('```shell')) {
        stats.toolInvocations++;
      }

      // Count line additions and deletions in diff blocks
      if (line.startsWith('+') && !line.startsWith('+++')) {
        stats.linesAdded++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        stats.linesDeleted++;
      }
    }

    // Calculate delta
    stats.linesDelta = stats.linesAdded - stats.linesDeleted;

    return stats;
  }
}

async function createGitRepositoryService(repoUrl) {
  return new GitRepositoryService(repoUrl);
}

async function createSpecRepositoryService(repoUrl) {
  return new SpecRepositoryService(repoUrl);
}

module.exports = {
  createGitRepositoryService,
  createSpecRepositoryService
};