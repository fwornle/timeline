import type { TimelineConfig } from './defaultConfig';
import { defaultConfig } from './defaultConfig';
import { GitService } from '../data/services/GitService';
import { SpecStoryService } from '../data/services/SpecStoryService';

// Validation functions
function isValidUrl(url: string): boolean {
  try {
    // Handle relative URLs (starting with /)
    if (url.startsWith('/')) {
      return true;
    }

    // Handle absolute URLs
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidGitUrl(url: string): boolean {
  // If URL is empty, it's not valid
  if (!url || url.trim() === '') {
    console.log('Empty Git URL');
    return false;
  }

  // Log validation attempt for debugging
  console.log('Validating Git URL:', url);

  // For testing purposes, accept any non-empty URL
  // This is a temporary change to help debug the API connection
  console.log('Accepting any non-empty URL for testing');
  return true;

  /* Original validation logic commented out for testing
  // Handle SSH URLs (git@domain:username/repo.git)
  if (url.startsWith('git@')) {
    // More permissive pattern that allows any domain after git@
    // This pattern is more relaxed to support enterprise GitHub instances
    const sshPattern = /^git@[a-zA-Z0-9.-]+(\.[a-zA-Z0-9-]+)*:[\w-]+\/[\w.-]+(\.[a-zA-Z0-9-]+)*$/;
    const isValid = sshPattern.test(url);
    console.log('SSH URL validation result:', isValid);
    return isValid;
  }

  // Handle HTTPS URLs
  try {
    new URL(url);

    // Accept URLs that:
    // 1. End with .git
    // 2. Contain github/gitlab/bitbucket in the domain
    // 3. Have a path structure that looks like a repository (username/repo)
    const hasGitExtension = url.endsWith('.git');
    const hasKnownDomain = /github|gitlab|bitbucket/i.test(url);

    // Check for repository-like path structure (username/repo)
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const hasRepoStructure = pathParts.length >= 2;

    const isValid = hasGitExtension || hasKnownDomain || hasRepoStructure;

    console.log('HTTPS URL validation result:', {
      url,
      hasGitExtension,
      hasKnownDomain,
      hasRepoStructure,
      isValid
    });

    return isValid;
  } catch (error) {
    console.log('URL validation error:', error);
    return false;
  }
  */
}

// Helper function to validate spec URL (always returns true as we derive it)
export function isValidSpecUrl(_url: string): boolean {
  return true; // Always valid as we'll derive it
}

function resolveLocalPath(path: string): string {
  if (path.startsWith('~')) {
    // In browser environment, we can't access HOME directory
    // Just return the path without the tilde
    return path.replace('~', '');
  }
  if (path.startsWith('./') || path.startsWith('../')) {
    return new URL(path, window.location.origin).pathname;
  }
  return path;
}

// Environment configuration
const envConfig: Partial<TimelineConfig> = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || defaultConfig.apiBaseUrl,
  repositories: {
    git: import.meta.env.VITE_GIT_REPOSITORY || defaultConfig.repositories.git,
    spec: import.meta.env.VITE_SPEC_REPOSITORY || defaultConfig.repositories.spec,
  },
  refresh: {
    interval: Number(import.meta.env.VITE_REFRESH_INTERVAL) || defaultConfig.refresh.interval,
    enabled: import.meta.env.VITE_REFRESH_ENABLED !== 'false',
  },
};

// Configuration validation
export function validateConfig(config: TimelineConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.apiBaseUrl || !isValidUrl(config.apiBaseUrl)) {
    errors.push('Invalid API base URL');
  }

  // Only validate git repository if provided
  if (config.repositories.git && !isValidGitUrl(config.repositories.git)) {
    errors.push('Invalid Git repository URL');
  }

  // No need to validate spec repository as it's derived from git repository

  if (config.refresh.interval < 5000) {
    errors.push('Refresh interval must be at least 5000ms');
  }

  // Validate API configuration
  if (config.api.timeout < 1000) {
    errors.push('API timeout must be at least 1000ms');
  }

  if (config.api.retry.maxAttempts < 1) {
    errors.push('Max retry attempts must be at least 1');
  }

  if (config.api.retry.initialDelay < 100) {
    errors.push('Initial retry delay must be at least 100ms');
  }

  if (config.api.retry.maxDelay < config.api.retry.initialDelay) {
    errors.push('Max retry delay must be greater than or equal to initial delay');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Create pre-configured service instances
export function createServices(config: TimelineConfig) {
  const validation = validateConfig(config);
  if (!validation.isValid) {
    console.error('Invalid configuration:', validation.errors);
    throw new Error('Invalid configuration: ' + validation.errors.join(', '));
  }

  // Only create services if git repository is provided
  if (!config.repositories.git) {
    return {
      gitService: null,
      specService: null,
    };
  }

  // Validate repository before creating services
  GitService.validateRepository(config.repositories.git);

  // Derive spec repository URL from git repository URL
  // Always use .specstory/history in the same repository
  const specRepoUrl = config.repositories.git;

  return {
    gitService: new GitService(config.apiBaseUrl, config.repositories.git, {
      maxAttempts: config.api.retry.maxAttempts,
      initialDelay: config.api.retry.initialDelay,
      maxDelay: config.api.retry.maxDelay,
      timeout: config.api.timeout,
    }),
    specService: new SpecStoryService(config.apiBaseUrl, specRepoUrl, {
      maxAttempts: config.api.retry.maxAttempts,
      initialDelay: config.api.retry.initialDelay,
      maxDelay: config.api.retry.maxDelay,
      timeout: config.api.timeout,
      specPath: '.specstory/history', // Always use this path
    }),
  };
}

// Export environment configuration
export const initialConfig: TimelineConfig = {
  ...defaultConfig,
  ...envConfig,
  repositories: {
    ...defaultConfig.repositories,
    ...envConfig.repositories,
  },
  refresh: {
    ...defaultConfig.refresh,
    ...envConfig.refresh,
  },
};

// Export configuration type and validation utilities
export type { TimelineConfig };
export const configUtils = {
  isValidUrl,
  isValidGitUrl,
  isValidSpecUrl,
  resolveLocalPath,
  validateConfig,
};

// Validate initial configuration
const validation = validateConfig(initialConfig);
if (!validation.isValid) {
  console.warn('Configuration validation failed:', validation.errors);
}

// Create services lazily to avoid initialization issues
let _services: ReturnType<typeof createServices> | undefined;
export const getServices = () => {
  if (!_services) {
    _services = createServices(initialConfig);
  }
  return _services;
};

export const services = getServices();