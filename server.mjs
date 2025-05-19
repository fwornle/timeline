import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createGitRepositoryService, createSpecRepositoryService } from './src/data/services/serviceWrapper.cjs';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
const exec = promisify(execCallback);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3030;
const API_PREFIX = '/api/v1';

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  console.error(`[${localTime()}] Uncaught Exception:`, error);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${localTime()}] Unhandled Rejection at:`, promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Persistent cache helpers
const TIMELINE_CACHE_DIR = path.join(__dirname, '.timeline-cache');
if (!fs.existsSync(TIMELINE_CACHE_DIR)) {
  fs.mkdirSync(TIMELINE_CACHE_DIR);
}

// Helper function to sanitize repository URL for filename
function sanitizeRepoUrl(repository) {
  // Replace common URL control characters with underscores
  return repository.replace(/[%@:\/]/g, '_');
}

// Helper function to get repo directory path
function getRepoDir(repository) {
  const safeRepo = sanitizeRepoUrl(repository);
  return path.join(TIMELINE_CACHE_DIR, safeRepo);
}

// Helper function to get cache file paths
function getCacheFilePath(repository, type) {
  const safeRepo = sanitizeRepoUrl(repository);
  return path.join(TIMELINE_CACHE_DIR, `${safeRepo}.${type}.json`);
}

function readCache(repository, type) {
  const filePath = getCacheFilePath(repository, type);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      console.log(`[${localTime()}] [CACHE] Read ${type} cache for repo ${repository}: ${data.data?.length || 0} items`);
      return data;
    } catch (e) {
      console.log(`[${localTime()}] [CACHE] Failed to read ${type} cache for repo ${repository}:`, e);
      return null;
    }
  }
  console.log(`[${localTime()}] [CACHE] No ${type} cache for repo ${repository}`);
  return null;
}

function writeCache(repository, type, data) {
  const filePath = getCacheFilePath(repository, type);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[${localTime()}] [CACHE] Wrote ${type} cache for repo ${repository}: ${data.data?.length || 0} items`);
}

// Soft purge - only removes cache files, keeps cloned repo
function purgeCacheFiles(repository) {
  ['git', 'spec'].forEach(type => {
    const filePath = getCacheFilePath(repository, type);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[${localTime()}] [CACHE] Purged ${type} cache for repo ${repository}`);
    }
  });
}

// Hard purge - removes both cache files and cloned repo
async function purgeAll(repository) {
  // First purge cache files
  purgeCacheFiles(repository);
  
  // Then remove cloned repo directory
  const repoDir = getRepoDir(repository);
  if (fs.existsSync(repoDir)) {
    try {
      await fs.promises.rm(repoDir, { recursive: true, force: true });
      console.log(`[${localTime()}] [CACHE] Purged cloned repo at ${repoDir}`);
    } catch (error) {
      console.error(`[${localTime()}] [CACHE] Failed to purge cloned repo:`, error);
      throw error;
    }
  }
}

// Helper for local time logging
function localTime() {
  return new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
}

// Helper function to generate mock git data
function generateMockGitData() {
  try {
    const mockCommits = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    for (let i = 0; i < 20; i++) {
      const commitDate = new Date(startDate);
      commitDate.setDate(commitDate.getDate() + (i * 3));
      const commitHash = `mock-hash-${i}`;

      mockCommits.push({
        id: commitHash,
        type: 'git',
        timestamp: commitDate.toISOString(),
        title: `Mock commit #${i}: ${i % 3 === 0 ? 'Feature' : i % 3 === 1 ? 'Fix' : 'Refactor'}`,
        authorName: 'Mock User',
        authorEmail: 'mock@example.com',
        branch: 'main',
        commitHash: commitHash,
        files: [
          { path: `src/file${i % 5}.js`, type: 'modified' },
          { path: `docs/doc${i % 3}.md`, type: 'added' }
        ]
      });
    }
    return mockCommits;
  } catch (error) {
    console.error(`[${localTime()}] Error generating mock git data:`, error);
    return [];
  }
}

// Helper function to generate mock spec data
function generateMockSpecData() {
  try {
    const mockSpecs = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    const specTypes = ['API', 'UI', 'Database', 'Architecture', 'Security'];
    const statuses = ['draft', 'review', 'approved', 'implemented', 'deprecated'];

    for (let i = 0; i < 15; i++) {
      const specDate = new Date(startDate);
      specDate.setDate(specDate.getDate() + (i * 5));

      const specType = specTypes[i % specTypes.length];
      const status = statuses[Math.min(i % statuses.length, 4)];
      const version = `0.${Math.floor(i / 3) + 1}.${i % 3}`;
      const specId = `mock-spec-${i}`;

      mockSpecs.push({
        id: `spec-${specId}-${version}`,
        type: 'spec',
        timestamp: specDate,
        title: `${specType} Specification ${i + 1}`,
        description: `This is a mock ${specType.toLowerCase()} specification for testing purposes`,
        author: 'Mock User',
        changes: [
          {
            field: 'status',
            oldValue: 'draft',
            newValue: status
          },
          {
            field: 'tags',
            oldValue: null,
            newValue: `${specType.toLowerCase()}, ${status}, v${version}`
          }
        ]
      });
    }
    return mockSpecs;
  } catch (error) {
    console.error(`[${localTime()}] Error generating mock spec data:`, error);
    return [];
  }
}

// Helper function to check if a port is in use
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

// Helper function to find an available port
async function findAvailablePort(startPort) {
  let port = startPort;
  while (await isPortInUse(port)) {
    port++;
  }
  return port;
}

// Add with other state variables
let activeOperations = new Map();

// Add helper function for operation locking
async function withOperationLock(repository, operation) {
  const operationKey = `${operation}_${repository}`;
  if (activeOperations.has(operationKey)) {
    throw new Error(`Operation ${operation} already in progress for ${repository}`);
  }

  try {
    activeOperations.set(operationKey, true);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure cleanup
    return await operation();
  } finally {
    activeOperations.delete(operationKey);
  }
}

// Create HTTP server with error handling
const server = http.createServer(async (req, res) => {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Parse the URL
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const query = parsedUrl.query;

    // Log the request with more details
    console.log(`[${localTime()}] ${req.method} ${req.url}`);
    console.log(`[${localTime()}] Headers:`, req.headers);
    if (Object.keys(query).length > 0) {
      console.log(`[${localTime()}] Query params:`, query);
    }

    // Log the request body if it's a POST request
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        console.log(`[${localTime()}] Request body:`, body);
      });
    }

    // Set default headers
    res.setHeader('Content-Type', 'application/json');

    // Health check endpoint
    if (path === `${API_PREFIX}/health`) {
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        data: {
          status: 'ok',
          uptime: process.uptime(),
          env: process.env.NODE_ENV || 'development'
        },
        timestamp: localTime()
      }));
      return;
    }

    // Soft purge endpoint (existing /purge endpoint)
    if (path === `${API_PREFIX}/purge` && req.method === 'POST') {
      const { repository } = query;
      if (repository) {
        purgeCacheFiles(repository);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: 'Cache files purged' }));
      } else {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, message: 'Repository required' }));
      }
      return;
    }

    // Hard purge endpoint (new)
    if (path === `${API_PREFIX}/purge/hard` && req.method === 'POST') {
      const { repository } = query;
      if (repository) {
        try {
          await withOperationLock(repository, async () => {
            console.log(`[${localTime()}] [CACHE] Starting hard reload for repo ${repository}`);
            
            // Delete the entire repository directory
            const repoDir = getRepoDir(repository);
            if (fs.existsSync(repoDir)) {
              await fs.promises.rm(repoDir, { recursive: true, force: true });
            }

            // Clear caches
            purgeCacheFiles(repository);
            console.log(`[${localTime()}] [CACHE] Purged git and spec caches for repo ${repository}`);
          });
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: 'Cache and cloned repo purged' }));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ 
            success: false, 
            message: 'Failed to purge repo',
            error: error.message 
          }));
        }
      } else {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, message: 'Repository required' }));
      }
      return;
    }

    // Git history endpoint
    if (path === `${API_PREFIX}/git/history` && req.method === 'GET') {
      console.log('Git history request received', { query });

      try {
        const { repository } = query;
        if (!repository) {
          throw new Error('Repository path is required');
        }

        // Check cache first
        const cached = readCache(repository, 'git');
        if (cached) {
          console.log(`[${localTime()}] [API] Returning cached git data for repo ${repository}: ${cached.data?.length || 0} items`);
          res.writeHead(200);
          res.end(JSON.stringify(cached));
          return;
        }

        // Try to get real data
        let gitData;
        let isMocked = false;
        try {
          const gitService = await createGitRepositoryService(repository);
          gitData = await gitService.getHistory();
          if (!gitData || gitData.length === 0) {
            throw new Error('No git data found');
          }
          console.log(`[${localTime()}] [API] Retrieved real git data for repo ${repository}: ${gitData.length} items`);
        } catch (error) {
          console.log(`[${localTime()}] [API] Failed to get real git data, generating mock data:`, error);
          gitData = generateMockGitData();
          isMocked = true;
        }

        const response = {
          success: true,
          data: gitData,
          timestamp: new Date().toISOString(),
          cached: false,
          mocked: isMocked
        };

        writeCache(repository, 'git', response);
        res.writeHead(200);
        res.end(JSON.stringify(response));
      } catch (error) {
        console.error('Git history request failed', {
          query,
          error: error.message
        });

        const status = error.message.includes('Invalid') ? 400 : 500;
        res.writeHead(status);
        res.end(JSON.stringify({
          success: false,
          error: {
            message: error.message,
            type: error.name,
            status
          },
          timestamp: new Date().toISOString()
        }));
      }
      return;
    }

    // Specs history endpoint
    if (path === `${API_PREFIX}/specs/history` && req.method === 'GET') {
      console.log('Spec history request received', { query });

      try {
        const { repository } = query;
        if (!repository) {
          throw new Error('Repository path is required');
        }

        // Check cache first
        const cached = readCache(repository, 'spec');
        if (cached) {
          console.log(`[${localTime()}] [API] Returning cached spec data for repo ${repository}: ${cached.data?.length || 0} items`);
          res.writeHead(200);
          res.end(JSON.stringify(cached));
          return;
        }

        // Try to get real data
        let specData;
        let isMocked = false;
        try {
          const specService = await createSpecRepositoryService(repository);
          specData = await specService.getHistory();
          if (!specData || specData.length === 0) {
            throw new Error('No spec data found');
          }
          console.log(`[${localTime()}] [API] Retrieved real spec data for repo ${repository}: ${specData.length} items`);
        } catch (error) {
          console.log(`[${localTime()}] [API] Failed to get real spec data, generating mock data:`, error);
          specData = generateMockSpecData();
          isMocked = true;
        }

        const response = {
          success: true,
          data: specData,
          timestamp: new Date().toISOString(),
          cached: false,
          mocked: isMocked
        };

        writeCache(repository, 'spec', response);
        res.writeHead(200);
        res.end(JSON.stringify(response));
      } catch (error) {
        console.error('Spec history request failed', {
          query,
          error: error.message
        });

        const status = error.message.includes('Invalid') ? 400 : 500;
        res.writeHead(status);
        res.end(JSON.stringify({
          success: false,
          error: {
            message: error.message,
            type: error.name,
            status
          },
          timestamp: new Date().toISOString()
        }));
      }
      return;
    }

    // Default response for other routes
    if (path === '/') {
      res.writeHead(200, {
        'Content-Type': 'text/plain'
      });
      res.end('API server running. Frontend is handled by Vite.');
      return;
    }

    // Not found
    res.writeHead(404, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({
      success: false,
      error: {
        message: 'Not found',
        type: 'NotFoundError',
        status: 404
      },
      timestamp: localTime()
    }));
  } catch (error) {
    console.error(`[${localTime()}] Server error:`, error);
    res.writeHead(500);
    res.end(JSON.stringify({
      success: false,
      error: {
        message: 'Internal server error',
        type: error.name,
        status: 500
      },
      timestamp: localTime()
    }));
  }
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[${localTime()}] Port ${PORT} is already in use. Please try another port.`);
    process.exit(1);
  } else {
    console.error(`[${localTime()}] Server error:`, error);
  }
});

// Start the server
async function startServer() {
  try {
    const port = await findAvailablePort(PORT);
    server.listen(port, () => {
      console.log(`[${localTime()}] Server is running at http://localhost:${port}`);
      console.log(`[${localTime()}] Health check available at http://localhost:${port}${API_PREFIX}/health`);
    });
  } catch (error) {
    console.error(`[${localTime()}] Failed to start server:`, error);
    process.exit(1);
  }
}

startServer();