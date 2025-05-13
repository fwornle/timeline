export interface TimelineConfig {
  apiBaseUrl: string;
  repositories: {
    git: string;
    spec: string;
  };
  api: {
    timeout: number;
    retry: {
      maxAttempts: number;
      initialDelay: number;
      maxDelay: number;
    };
  };
  display: {
    defaultTimespan: {
      days: number;
    };
    theme: {
      git: {
        color: string;
        opacity: number;
      };
      spec: {
        color: string;
        opacity: number;
      };
    };
  };
  refresh: {
    interval: number; // milliseconds
    enabled: boolean;
  };
}

// Environment-specific configuration
const isDev = import.meta.env.DEV;
const apiPort = 5173;
const apiVersion = 'v1';

export const defaultConfig: TimelineConfig = {
  apiBaseUrl: isDev
    ? `http://localhost:${apiPort}/api/${apiVersion}`
    : `${window.location.origin}/api/${apiVersion}`,
  repositories: {
    git: 'https://github.com/yourusername/yourrepo',
    spec: 'https://specs.yourdomain.com/project',
  },
  api: {
    timeout: 15000, // 15 seconds
    retry: {
      maxAttempts: 3,
      initialDelay: 1000, // 1 second
      maxDelay: 10000 // 10 seconds
    }
  },
  display: {
    defaultTimespan: {
      days: 30,
    },
    theme: {
      git: {
        color: '#4CAF50',
        opacity: 0.8,
      },
      spec: {
        color: '#2196F3',
        opacity: 0.8,
      },
    },
  },
  refresh: {
    interval: 300000, // 5 minutes
    enabled: true,
  },
};