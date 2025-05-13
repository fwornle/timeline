import type { TimelineConfig } from './defaultConfig';
import { defaultConfig } from './defaultConfig';
import { GitService } from '../data/services/GitService';
import { SpecStoryService } from '../data/services/SpecStoryService';

// Validation functions
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidGitUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  return url.endsWith('.git') || url.includes('github.com') || url.includes('gitlab.com') || url.includes('bitbucket.org');
}

function isValidSpecUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  return url.includes('specs.') || url.endsWith('.specstory');
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

  if (!config.repositories.git || !isValidGitUrl(config.repositories.git)) {
    errors.push('Invalid Git repository URL');
  }

  if (!config.repositories.spec || !isValidSpecUrl(config.repositories.spec)) {
    errors.push('Invalid Spec repository URL');
  }

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

  // Validate repositories before creating services
  GitService.validateRepository(config.repositories.git);

  return {
    gitService: new GitService(config.apiBaseUrl, config.repositories.git, {
      maxAttempts: config.api.retry.maxAttempts,
      initialDelay: config.api.retry.initialDelay,
      maxDelay: config.api.retry.maxDelay,
      timeout: config.api.timeout,
    }),
    specService: new SpecStoryService(config.apiBaseUrl, config.repositories.spec, {
      maxAttempts: config.api.retry.maxAttempts,
      initialDelay: config.api.retry.initialDelay,
      maxDelay: config.api.retry.maxDelay,
      timeout: config.api.timeout,
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