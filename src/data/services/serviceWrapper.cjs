const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

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

      // Try HTTPS URL first, then SSH if that fails
      const httpsUrl = this.repoUrl.replace('git@', 'https://').replace(':', '/');
      
      // Clone or update the repository
      try {
        console.log(`[${localTime()}] [GIT] Attempting to clone with HTTPS: ${httpsUrl}`);
        await execAsync(`git clone ${httpsUrl} ${workDir}`);
        console.log(`[${localTime()}] [GIT] Repository cloned successfully with HTTPS`);
      } catch (httpsError) {
        console.log(`[${localTime()}] [GIT] HTTPS clone failed, trying SSH: ${this.repoUrl}`);
        try {
          // If directory exists from failed HTTPS attempt, remove it
          if (fs.existsSync(workDir)) {
            await fs.promises.rm(workDir, { recursive: true, force: true });
          }
          
          await execAsync(`git clone ${this.repoUrl} ${workDir}`);
          console.log(`[${localTime()}] [GIT] Repository cloned successfully with SSH`);
        } catch (sshError) {
          // If both HTTPS and SSH fail, check if we have an existing clone
          if (fs.existsSync(workDir)) {
            console.log(`[${localTime()}] [GIT] Using existing repository at ${workDir}`);
            try {
              await execAsync(`cd ${workDir} && git fetch && git reset --hard origin/main`);
              console.log(`[${localTime()}] [GIT] Repository updated successfully`);
            } catch (updateError) {
              console.error(`[${localTime()}] [GIT] Failed to update existing repository:`, updateError);
              throw updateError;
            }
          } else {
            console.error(`[${localTime()}] [GIT] Both HTTPS and SSH clone attempts failed:`);
            console.error(`[${localTime()}] [GIT] HTTPS Error:`, httpsError.message);
            console.error(`[${localTime()}] [GIT] SSH Error:`, sshError.message);
            throw new Error('Failed to clone repository using both HTTPS and SSH');
          }
        }
      }

      // Get git history
      console.log(`[${localTime()}] [GIT] Fetching git log`);
      const { stdout } = await execAsync(
        `cd ${workDir} && git log --pretty=format:"%H|%aI|%an|%ae|%s" --name-status`
      );

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
            files: []
          };
        } else if (line.trim() && currentCommit) {
          // This is a file change line
          const [status, ...pathParts] = line.trim().split('\t');
          const path = pathParts.join('\t');
          if (path) {
            currentCommit.files = currentCommit.files || [];
            currentCommit.files.push({
              path,
              changeType: status === 'A' ? 'added' : status === 'M' ? 'modified' : 'deleted'
            });
          }
        } else if (!line.trim() && currentCommit) {
          // Empty line means end of commit
          events.push(currentCommit);
          currentCommit = null;
        }
      });

      // Don't forget the last commit
      if (currentCommit) {
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
      
      // Parse frontmatter and content
      const lines = content.split('\n');
      const frontmatter = {};
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
      const specId = `${dateStr}-${timeStr}-${titleSlug}`;

      // Extract type from title or use default
      const typeMatch = titleSlug.match(/(system|api|ui|database|architecture|security|refactoring|documentation)/i);
      const type = typeMatch ? typeMatch[1].toLowerCase() : 'general';

      // Extract status from title or use default
      const statusMatch = titleSlug.match(/(draft|review|approved|implemented|deprecated)/i);
      const status = statusMatch ? statusMatch[1].toLowerCase() : 'draft';

      return {
        id: specId,
        type: 'spec',
        timestamp,
        title,
        description,
        specId,
        version,
        status: frontmatter.status || status,
        tags: [
          type,
          frontmatter.status || status,
          `v${version}`
        ]
      };
    } catch (error) {
      console.error(`[${localTime()}] [SPEC] Failed to parse spec file ${filename}:`, error);
      return null;
    }
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