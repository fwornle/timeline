const http = require('http');
const url = require('url');
const fs = require('fs');
const pathModule = require('path');

const PORT = 3030;
const API_PREFIX = '/api/v1';

// Persistent mock cache helpers
const MOCK_CACHE_DIR = pathModule.join(__dirname, '.mockcache');
if (!fs.existsSync(MOCK_CACHE_DIR)) {
  fs.mkdirSync(MOCK_CACHE_DIR);
}
function getCacheFilePath(repository, type) {
  // type: 'git' or 'spec'
  const safeRepo = encodeURIComponent(repository);
  return pathModule.join(MOCK_CACHE_DIR, `${safeRepo}.${type}.json`);
}
function readMockCache(repository, type) {
  const filePath = getCacheFilePath(repository, type);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      return null;
    }
  }
  return null;
}
function writeMockCache(repository, type, data) {
  const filePath = getCacheFilePath(repository, type);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
function purgeMockCache(repository) {
  ['git', 'spec'].forEach(type => {
    const filePath = getCacheFilePath(repository, type);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });
}

// Create HTTP server
const server = http.createServer((req, res) => {
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
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log(`[${new Date().toISOString()}] Headers:`, req.headers);
  if (Object.keys(query).length > 0) {
    console.log(`[${new Date().toISOString()}] Query params:`, query);
  }

  // Log the request body if it's a POST request
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      console.log(`[${new Date().toISOString()}] Request body:`, body);
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
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Purge endpoint
  if (path === `${API_PREFIX}/purge`) {
    const { repository } = query;
    if (repository) {
      purgeMockCache(repository);
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

      // Persistent cache check
      const cached = readMockCache(repository, 'git');
      if (cached) {
        res.writeHead(200);
        res.end(JSON.stringify(cached));
        return;
      }

      // Generate mock data with multiple commits
      const mockCommits = [];
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3); // Start 3 months ago

      for (let i = 0; i < 20; i++) {
        const commitDate = new Date(startDate);
        commitDate.setDate(commitDate.getDate() + (i * 3)); // One commit every 3 days

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

      console.log('Git history request successful', {
        repository,
        commitCount: mockCommits.length,
        firstCommitDate: mockCommits[0]?.timestamp,
        lastCommitDate: mockCommits[mockCommits.length - 1]?.timestamp
      });

      const response = {
        success: true,
        data: mockCommits,
        timestamp: new Date().toISOString(),
        cached: true, // Keep for backward compatibility
        mocked: true  // New flag to indicate this is mock data
      };
      writeMockCache(repository, 'git', response);
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
  if (path === `${API_PREFIX}/specs/history`) {
    console.log('Spec history request received', { query });

    try {
      const { repository } = query;
      if (!repository) {
        throw new Error('Repository path is required');
      }

      // Persistent cache check
      const cached = readMockCache(repository, 'spec');
      if (cached) {
        res.writeHead(200);
        res.end(JSON.stringify(cached));
        return;
      }

      // Generate mock data with multiple specs
      const mockSpecs = [];
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3); // Start 3 months ago

      const specTypes = ['API', 'UI', 'Database', 'Architecture', 'Security'];
      const statuses = ['draft', 'review', 'approved', 'implemented', 'deprecated'];

      for (let i = 0; i < 15; i++) {
        const specDate = new Date(startDate);
        specDate.setDate(specDate.getDate() + (i * 5)); // One spec every 5 days

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

      console.log('Spec history request successful', {
        repository,
        entryCount: mockSpecs.length,
        firstSpecDate: mockSpecs[0]?.timestamp,
        lastSpecDate: mockSpecs[mockSpecs.length - 1]?.timestamp
      });

      const response = {
        success: true,
        data: mockSpecs,
        timestamp: new Date().toISOString(),
        cached: true, // Keep for backward compatibility
        mocked: true  // New flag to indicate this is mock data
      };
      writeMockCache(repository, 'spec', response);
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
    timestamp: new Date().toISOString()
  }));
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}${API_PREFIX}/health`);
});
