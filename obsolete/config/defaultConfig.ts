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

// API version
const apiVersion = 'v1';

export const defaultConfig: TimelineConfig = {
  // In development, we use the proxy configured in vite.config.ts
  // In production, we use the same origin
  apiBaseUrl: `/api/${apiVersion}`,
  repositories: {
    git: '',
    spec: '',
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