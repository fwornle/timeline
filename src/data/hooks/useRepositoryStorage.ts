import { useState, useCallback } from 'react';
import { logger } from '../../utils/logging/logger';

// Storage keys
const REPO_URL_KEY = 'timeline-last-repo-url';
const REPO_DATA_PREFIX = 'timeline-repo-data-';

// Cache expiration time (24 hours in milliseconds)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

interface RepositoryData {
  gitEvents: any[];
  specEvents: any[];
  timestamp: number;
  isMocked?: boolean;
}

export function useRepositoryStorage() {
  // Last used repository URL
  const [lastRepoUrl, setLastRepoUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(REPO_URL_KEY) || '';
    } catch (error) {
      logger.error('storage', 'Failed to load last repository URL', { error });
      return '';
    }
  });

  // Save repository URL to localStorage
  const saveRepoUrl = useCallback((url: string) => {
    try {
      localStorage.setItem(REPO_URL_KEY, url);
      setLastRepoUrl(url);
      logger.info('storage', 'Saved repository URL', { url });
    } catch (error) {
      logger.error('storage', 'Failed to save repository URL', { error, url });
    }
  }, []);

  // Save repository data to localStorage
  const saveRepoData = useCallback((url: string, gitEvents: any[], specEvents: any[], isMocked: boolean = false) => {
    if (!url) return;

    try {
      // Check if there's existing data to preserve metadata
      let existingData: Partial<RepositoryData> = {};
      try {
        const dataStr = localStorage.getItem(`${REPO_DATA_PREFIX}${url}`);
        if (dataStr) {
          const parsed = JSON.parse(dataStr) as RepositoryData;
          // Only preserve the isMocked flag if it exists
          if (parsed.isMocked !== undefined) {
            existingData.isMocked = parsed.isMocked;
          }
        }
      } catch (e) {
        // Ignore errors reading existing data
      }

      const data: RepositoryData = {
        gitEvents,
        specEvents,
        timestamp: Date.now(),
        isMocked: isMocked || existingData.isMocked
      };

      localStorage.setItem(`${REPO_DATA_PREFIX}${url}`, JSON.stringify(data));
      logger.info('storage', 'Saved repository data', {
        url,
        gitEventsCount: gitEvents.length,
        specEventsCount: specEvents.length,
        isMocked: data.isMocked
      });
    } catch (error) {
      logger.error('storage', 'Failed to save repository data', { error, url });
    }
  }, []);

  // Load repository data from localStorage
  const loadRepoData = useCallback((url: string): { gitEvents: any[], specEvents: any[], isMocked?: boolean } | null => {
    if (!url) return null;

    try {
      const dataStr = localStorage.getItem(`${REPO_DATA_PREFIX}${url}`);
      if (!dataStr) return null;

      const data = JSON.parse(dataStr) as RepositoryData;

      // Check if data is expired
      if (Date.now() - data.timestamp > CACHE_EXPIRATION) {
        logger.info('storage', 'Repository data is expired', { url });
        localStorage.removeItem(`${REPO_DATA_PREFIX}${url}`);
        return null;
      }

      logger.info('storage', 'Loaded repository data from cache', {
        url,
        gitEventsCount: data.gitEvents.length,
        specEventsCount: data.specEvents.length,
        isMocked: !!data.isMocked,
        age: Math.round((Date.now() - data.timestamp) / 1000 / 60) + ' minutes'
      });

      return {
        gitEvents: data.gitEvents,
        specEvents: data.specEvents,
        isMocked: data.isMocked
      };
    } catch (error) {
      logger.error('storage', 'Failed to load repository data', { error, url });
      return null;
    }
  }, []);

  // Clear repository data for a specific URL
  const clearRepoData = useCallback((url: string) => {
    if (!url) return;

    try {
      localStorage.removeItem(`${REPO_DATA_PREFIX}${url}`);
      logger.info('storage', 'Cleared repository data', { url });
    } catch (error) {
      logger.error('storage', 'Failed to clear repository data', { error, url });
    }
  }, []);

  // Purge repository data for a specific URL and mark it as mocked
  const purgeRepoData = useCallback((url: string) => {
    if (!url) return;

    try {
      // Get the existing data
      const dataStr = localStorage.getItem(`${REPO_DATA_PREFIX}${url}`);
      if (!dataStr) {
        logger.info('storage', 'No data to purge for repository', { url });
        return;
      }

      // Parse the data
      const data = JSON.parse(dataStr) as RepositoryData;

      // Mark the data as mocked by setting a flag
      const mockedData: RepositoryData = {
        ...data,
        gitEvents: [],
        specEvents: [],
        timestamp: Date.now(),
        isMocked: true
      };

      // Save the updated data
      localStorage.setItem(`${REPO_DATA_PREFIX}${url}`, JSON.stringify(mockedData));
      logger.info('storage', 'Purged repository data and marked as mocked', { url });
    } catch (error) {
      logger.error('storage', 'Failed to purge repository data', { error, url });
      // If there's an error, just remove the data completely
      clearRepoData(url);
    }
  }, [clearRepoData]);

  // Check if repository data exists and is valid
  const hasValidRepoData = useCallback((url: string): boolean => {
    if (!url) return false;

    try {
      const dataStr = localStorage.getItem(`${REPO_DATA_PREFIX}${url}`);
      if (!dataStr) return false;

      const data = JSON.parse(dataStr) as RepositoryData;
      const isValid = Date.now() - data.timestamp <= CACHE_EXPIRATION;
      const hasEvents = data.gitEvents?.length > 0 || data.specEvents?.length > 0;
      const isMocked = !!data.isMocked;

      logger.info('storage', 'Repository data cache status', {
        url,
        isValid,
        hasEvents,
        isMocked,
        isCached: isValid && (hasEvents || isMocked),
        age: Math.round((Date.now() - data.timestamp) / (60 * 60 * 1000)) + ' hours'
      });

      // Data is valid if it's within expiration time AND either has events OR is marked as mocked
      return isValid && (hasEvents || isMocked);
    } catch (error) {
      logger.error('storage', 'Error checking repository data validity', { error, url });
      return false;
    }
  }, []);

  return {
    lastRepoUrl,
    saveRepoUrl,
    saveRepoData,
    loadRepoData,
    clearRepoData,
    purgeRepoData,
    hasValidRepoData
  };
}
