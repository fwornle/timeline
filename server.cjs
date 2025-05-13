const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { URL } = require('url');
const { logger } = require('./server-logger.cjs');

const execAsync = promisify(exec);
const app = express();
const PORT = 5173;
const COMMAND_TIMEOUT = 30000; // 30 seconds
const API_PREFIX = '/api/v1';

// Configure Express middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'development'
        ? ['http://localhost:5173', 'http://127.0.0.1:5173']
        : process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
}));

// Request logging middleware
app.use((req, res, next) => {
    logger.debug('http', 'Incoming request', {
        method: req.method,
        url: req.url,
        path: req.path,
        query: req.query,
        headers: req.headers
    });
    next();
});

// Request Validation Middleware
const validateRequest = (req, res, next) => {
    const startTime = Date.now();
    logger.debug('request', 'Incoming request', {
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined
    });

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info('request', 'Request completed', {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration
        });
    });

    next();
};

app.use(validateRequest);

// Helper Functions
const sanitizeInput = (input, isUrl = false) => {
    logger.debug('security', 'Sanitizing input', { input, isUrl });
    if (!input || typeof input !== 'string') {
        throw new Error('Invalid input: must be a non-empty string');
    }
    
    if (isUrl) {
        try {
            const url = new URL(input);
            return url.toString();
        } catch (error) {
            logger.error('security', 'Invalid URL format', { input, error: error.message });
            throw new Error('Invalid URL format');
        }
    }

    // For filesystem paths, remove potentially dangerous characters
    const sanitized = input.replace(/[^a-zA-Z0-9-_./]/g, '');
    logger.debug('security', 'Sanitized input', { original: input, sanitized });
    return sanitized;
};

const parseRepositoryUrl = (repoUrl) => {
    logger.debug('git', 'Parsing repository URL', { repoUrl });
    try {
        // For HTTP(S) URLs, verify they're valid but return as-is
        if (repoUrl.startsWith('http://') || repoUrl.startsWith('https://')) {
            const url = new URL(repoUrl);
            logger.debug('git', 'Valid remote repository URL', { url: url.toString() });
            return repoUrl; // Keep the full URL for remote repositories
        }
        
        // For filesystem paths, normalize them
        const normalizedPath = path.normalize(repoUrl);
        logger.debug('git', 'Normalized local repository path', {
            original: repoUrl,
            normalized: normalizedPath
        });
        return normalizedPath;
    } catch (error) {
        logger.error('git', 'Failed to parse repository URL', {
            error: error.message,
            repoUrl
        });
        throw new Error('Invalid repository URL format');
    }
};

const validateRepositoryPath = async (repoPath) => {
    logger.debug('git', 'Validating repository path', { repoPath });
    try {
        // For URLs, just validate the format
        if (repoPath.startsWith('http://') || repoPath.startsWith('https://')) {
            const sanitizedUrl = sanitizeInput(repoPath, true);
            const parsedUrl = parseRepositoryUrl(sanitizedUrl);
            
            logger.debug('git', 'Remote repository URL validated', {
                original: repoPath,
                parsed: parsedUrl
            });
            
            // For demo/testing, accept any valid URL
            // In production, you'd want to verify the repository exists
            return parsedUrl;
        }

        // For local paths, verify the .git directory exists
        const sanitizedPath = sanitizeInput(repoPath);
        const normalizedPath = parseRepositoryUrl(sanitizedPath);
        const absolutePath = path.resolve(normalizedPath);
        const gitPath = path.join(absolutePath, '.git');

        logger.debug('git', 'Checking local repository path', {
            original: repoPath,
            normalized: normalizedPath,
            absolute: absolutePath,
            gitPath
        });

        const stats = await fs.stat(gitPath);
        if (!stats.isDirectory()) {
            throw new Error('Not a git repository');
        }

        return absolutePath;
    } catch (error) {
        logger.error('git', 'Repository validation failed', {
            error: error.message,
            repoPath,
            isUrl: repoPath.startsWith('http')
        });
        throw new Error(`Invalid repository path: ${error.message}`);
    }
};

const executeGitCommand = async (repoPath, command) => {
    logger.debug('git', 'Executing git command', { repoPath, command });
    try {
        const { stdout, stderr } = await execAsync(command, {
            cwd: repoPath,
            timeout: COMMAND_TIMEOUT,
            maxBuffer: 10 * 1024 * 1024 // 10MB
        });

        if (stderr) {
            logger.warn('git', 'Git command produced stderr', { stderr });
        }

        return stdout;
    } catch (error) {
        logger.error('git', 'Git command failed', {
            error: error.message,
            command,
            timeout: error.killed,
            code: error.code
        });
        throw new Error(`Git command failed: ${error.message}`);
    }
};

const getGitHistory = async (repoPath) => {
    logger.info('git', 'Fetching git history', { repoPath });
    try {
        // For remote repositories, return mock data for demo/testing
        if (repoPath.startsWith('http')) {
            logger.info('git', 'Using mock data for remote repository', { repoPath });
            return [{
                hash: 'mock-hash',
                timestamp: new Date().toISOString(),
                author: {
                    name: 'Mock User',
                    email: 'mock@example.com'
                },
                message: 'Mock commit for remote repository',
                branch: 'main',
                files: []
            }];
        }

        // For local repositories, use git command
        const cmd = `git -C "${repoPath}" log --pretty=format:"%H|||%ai|||%an|||%ae|||%s|||%D" --name-status`;
        const stdout = await executeGitCommand(repoPath, cmd);
        
        const commits = stdout.split('\n\n').map(commit => {
            const [commitInfo, ...fileChanges] = commit.split('\n');
            const [hash, timestamp, authorName, authorEmail, message, refs] = commitInfo.split('|||');
            
            const files = fileChanges.map(change => {
                const [status, filepath] = change.split('\t');
                return { path: filepath, status };
            });

            return {
                hash,
                timestamp,
                author: {
                    name: authorName,
                    email: authorEmail
                },
                message,
                branch: refs ? refs.replace('HEAD -> ', '').split(',')[0].trim() : 'main',
                files
            };
        });

        logger.debug('git', 'Processed git history', {
            commitCount: commits.length,
            isRemote: false
        });
        return commits;
    } catch (error) {
        logger.error('git', 'Failed to get git history', {
            error: error.message,
            isRemote: repoPath.startsWith('http')
        });
        throw error;
    }
};

const validateSpecStoryStructure = async (repoPath) => {
    logger.debug('specs', 'Validating .specstory structure', { repoPath });
    const specDir = path.join(repoPath, '.specstory');
    const historyFile = path.join(specDir, 'history');

    try {
        const [dirStats, fileStats] = await Promise.all([
            fs.stat(specDir),
            fs.stat(historyFile)
        ]);

        if (!dirStats.isDirectory()) {
            throw new Error('.specstory is not a directory');
        }
        if (!fileStats.isFile()) {
            throw new Error('history is not a file');
        }

        return true;
    } catch (error) {
        logger.error('specs', '.specstory validation failed', { error: error.message });
        return false;
    }
};

const getSpecHistory = async (repoPath) => {
    logger.info('specs', 'Fetching spec history', { repoPath });
    try {
        const isValid = await validateSpecStoryStructure(repoPath);
        if (!isValid) {
            throw new Error('Invalid .specstory structure');
        }

        const specPath = path.join(repoPath, '.specstory', 'history');
        const data = await fs.readFile(specPath, 'utf8');
        
        try {
            const history = JSON.parse(data);
            logger.debug('specs', 'Processed spec history', {
                entryCount: Array.isArray(history) ? history.length : 'invalid'
            });
            return history;
        } catch (parseError) {
            logger.error('specs', 'Failed to parse spec history JSON', { error: parseError.message });
            throw new Error('Invalid spec history format');
        }
    } catch (error) {
        logger.error('specs', 'Failed to read spec history', { error: error.message });
        throw error;
    }
};

// Create API Router with JSON responses
const router = express.Router();

// Response formatting middleware
router.use((req, res, next) => {
    // Add response helpers
    res.success = function(data) {
        return this.json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    };

    res.error = function(error, status = 500) {
        return this.status(status).json({
            success: false,
            error: {
                message: error.message || 'Unknown error',
                type: error.name || 'Error',
                status
            },
            timestamp: new Date().toISOString()
        });
    };

    next();
});

// Health Check Endpoint
router.get('/health', (req, res) => {
    try {
        logger.debug('routes', 'Health check requested');
        res.json({
            success: true,
            data: {
                status: 'ok',
                uptime: process.uptime(),
                env: process.env.NODE_ENV || 'development'
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('routes', 'Health check failed', { error });
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
                type: error.name,
                status: 500
            },
            timestamp: new Date().toISOString()
        });
    }
});

// Git History Endpoint
router.get('/git/history', async (req, res) => {
    logger.info('api', 'Git history request received', { query: req.query });
    try {
        const { repository } = req.query;
        if (!repository) {
            throw new Error('Repository path is required');
        }

        const validatedPath = await validateRepositoryPath(repository);
        const history = await getGitHistory(validatedPath);
        
        logger.info('api', 'Git history request successful', {
            repository,
            commitCount: history.length
        });
        
        res.json({
            success: true,
            data: history,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('api', 'Git history request failed', {
            query: req.query,
            error: error.message
        });
        
        const status = error.message.includes('Invalid') ? 400 : 500;
        res.status(status).json({
            success: false,
            error: {
                message: error.message,
                type: error.name,
                status
            },
            timestamp: new Date().toISOString()
        });
    }
});

// Specs History Endpoint
router.get('/specs/history', async (req, res) => {
    logger.info('api', 'Spec history request received', { query: req.query });
    try {
        const { repository } = req.query;
        if (!repository) {
            throw new Error('Repository path is required');
        }

        const validatedPath = await validateRepositoryPath(repository);
        const history = await getSpecHistory(validatedPath);
        
        logger.info('api', 'Spec history request successful', {
            repository,
            entryCount: history.length
        });
        
        res.json({
            success: true,
            data: history,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('api', 'Spec history request failed', {
            query: req.query,
            error: error.message
        });
        
        const status = error.message.includes('Invalid') ? 400 : 500;
        res.status(status).json({
            success: false,
            error: {
                message: error.message,
                type: error.name,
                status
            },
            timestamp: new Date().toISOString()
        });
    }
});

// Register uncaught error handler first
process.on('uncaughtException', (error) => {
    logger.error('system', 'Uncaught exception', {
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
});

// Set content type for all responses
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

// Mount API routes (single mount point)
app.use(API_PREFIX, router);

// Error Handling Middleware
app.use((err, req, res, next) => {
    // Log error details
    logger.error('system', 'Error handler caught error', {
        error: err.message,
        stack: err.stack,
        url: req.path,
        method: req.method,
        query: req.query
    });

    // Determine error status
    let status = 500;
    if (/Invalid repository|Invalid input|Invalid.*format/.test(err.message)) {
        status = 400;
    } else if (/Failed to read spec history|Not a git repository/.test(err.message)) {
        status = 404;
    }

    // Create consistent error response
    const response = {
        success: false,
        error: {
            message: err.message || 'Internal server error',
            type: err.name || 'Error',
            status: status
        },
        timestamp: new Date().toISOString()
    };

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
        response.error.stack = err.stack;
    }

    // Send JSON response
    res.status(status).json(response);
});

// Log registered routes and mount router
const routes = router.stack
    .filter(r => r.route)
    .map(r => ({
        path: r.route.path,
        fullPath: `${API_PREFIX}${r.route.path}`,
        methods: Object.keys(r.route.methods).join(', ').toUpperCase()
    }));

logger.info('system', 'Mounting API routes', {
    endpoints: routes,
    count: routes.length,
    prefix: API_PREFIX
});

// Final router mount
app.use(API_PREFIX, router);

// Start Server
app.listen(PORT, () => {
    logger.info('system', 'Server initialization complete', {
        port: PORT,
        apiPrefix: API_PREFIX,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        endpoints: routes.map(r => r.fullPath)
    });

    logger.info('system', `Server is running at http://localhost:${PORT}`);
    logger.info('system', 'Health check available at http://localhost:${PORT}${API_PREFIX}/health');
});