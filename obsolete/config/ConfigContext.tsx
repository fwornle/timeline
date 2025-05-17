import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { TimelineConfig } from './defaultConfig';
import { defaultConfig } from './defaultConfig';

interface ConfigContextValue {
  config: TimelineConfig;
  updateConfig: (updates: Partial<TimelineConfig>) => void;
  resetConfig: () => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

const CONFIG_STORAGE_KEY = 'timeline-config';

interface ConfigProviderProps {
  children: ReactNode;
  initialConfig?: Partial<TimelineConfig>;
}

export function ConfigProvider({ children, initialConfig }: ConfigProviderProps) {
  const [config, setConfig] = useState<TimelineConfig>(() => {
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...defaultConfig,
          ...parsed,
          ...initialConfig,
        };
      }
    } catch (error) {
      console.error('Error loading stored config:', error);
    }
    return { ...defaultConfig, ...initialConfig };
  });

  useEffect(() => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const updateConfig = useCallback((updates: Partial<TimelineConfig>) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        ...updates,
      };
      return newConfig;
    });
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(defaultConfig);
  }, []);

  const value = {
    config,
    updateConfig,
    resetConfig,
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}

// Utility hook for accessing specific config sections
export function useDisplayConfig() {
  const { config } = useConfig();
  return config.display;
}

export function useRepositoryConfig() {
  const { config } = useConfig();
  return config.repositories;
}

export function useRefreshConfig() {
  const { config } = useConfig();
  return config.refresh;
}