const http = require('http');
const url = require('url');
const fs = require('fs');
const pathModule = require('path');
const { createGitRepositoryService, createSpecRepositoryService } = require('./src/data/services/serviceWrapper.cjs');

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
const TIMELINE_CACHE_DIR = pathModule.join(__dirname, '.timeline-cache');
if (!fs.existsSync(TIMELINE_CACHE_DIR)) {
  fs.mkdirSync(TIMELINE_CACHE_DIR);
}

// Helper function to sanitize repository URL for filename
function sanitizeRepoUrl(repository) {
  // Replace common URL control characters with underscores
  return repository.replace(/[%@:\/]/g, '_');
}

function getCacheFilePath(repository, type) {
  // type: 'git' or 'spec'
  const safeRepo = sanitizeRepoUrl(repository);
  return pathModule.join(TIMELINE_CACHE_DIR, `${safeRepo}.${type}.json`);
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

function purgeCache(repository) {
  ['git', 'spec'].forEach(type => {
    const filePath = getCacheFilePath(repository, type);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[${localTime()}] [CACHE] Purged ${type} cache for repo ${repository}`);
    }
  });
}

// Helper for local time logging
function localTime() {
  return new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
}

// Helper function to generate mock git data
function generateMockGitData() {
  const mockCommits = [];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);

  for (let i = 0; i < 20; i++) {
    const commitDate = new Date(startDate);
    commitDate.setDate(commitDate.getDate() + (i * 3));

    mockCommits.push({
      hash: `mock-hash-${i}`,
      timestamp: commitDate.toISOString(),
      author: {
        name: 'Mock User',
        email: 'mock@example.com'
      },
      message: `Mock commit #${i}: ${i % 3 === 0 ? 'Feature' : i % 3 === 1 ? 'Fix' : 'Refactor'} - ${Math.random().toString(36).substring(7)}`,
      branch: 'main',
      files: [
        { path: `src/file${i % 5}.js`, status: 'M' },
        { path: `docs/doc${i % 3}.md`, status: 'A' }
      ]
    });
  }
  return mockCommits;
}

// Helper function to generate mock spec data
function generateMockSpecData() {
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

    mockSpecs.push({
      id: `mock-spec-${i}`,
      timestamp: specDate.toISOString(),
      author: 'Mock User',
      title: `${specType} Specification ${i + 1}`,
      description: `This is a mock ${specType.toLowerCase()} specification for testing purposes`,
      status: status,
      version: version,
      tags: [specType.toLowerCase(), status, `v${version}`]
    });
  }
  return mockSpecs;
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

    // Purge endpoint
    if (path === `${API_PREFIX}/purge`) {
      const { repository } = query;
      if (repository) {
        purgeCache(repository);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: 'Cache purged' }));
      } else {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, message: 'Repository required' }));
      }
      return;
    }

    // Git history endpoint
    if (path === `${API_PREFIX}/git/history`) {
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
          console.log(`[${localTime()}] [API] Retrieved real git data for repo ${repository}: ${gitData.length} items`);
        } catch (error) {
          console.log(`[${localTime()}] [API] Failed to get real git data, falling back to mock data:`, error);
          gitData = generateMockGitData();
          isMocked = true;
        }

        const response = {
          success: true,
          data: gitData,
          timestamp: localTime(),
          cached: true,
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
          timestamp: localTime()
        }));
      }
      return;
    }

    // Specs history endpoint
    if (path === `${API_PREFIX}/specs/history`) {
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
          console.log(`[${localTime()}] [API] Retrieved real spec data for repo ${repository}: ${specData.length} items`);
        } catch (error) {
          console.log(`[${localTime()}] [API] Failed to get real spec data, falling back to mock data:`, error);
          specData = generateMockSpecData();
          isMocked = true;
        }

        const response = {
          success: true,
          data: specData,
          timestamp: localTime(),
          cached: true,
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
          timestamp: localTime()
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
server.listen(PORT, () => {
  console.log(`[${localTime()}] Server is running at http://localhost:${PORT}`);
  console.log(`[${localTime()}] Health check available at http://localhost:${PORT}${API_PREFIX}/health`);
});