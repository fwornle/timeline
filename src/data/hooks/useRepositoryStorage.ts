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
  const saveRepoData = useCallback((url: string, gitEvents: any[], specEvents: any[]) => {
    if (!url) return;

    try {
      const data: RepositoryData = {
        gitEvents,
        specEvents,
        timestamp: Date.now()
      };

      localStorage.setItem(`${REPO_DATA_PREFIX}${url}`, JSON.stringify(data));
      logger.info('storage', 'Saved repository data', {
        url,
        gitEventsCount: gitEvents.length,
        specEventsCount: specEvents.length
      });
    } catch (error) {
      logger.error('storage', 'Failed to save repository data', { error, url });
    }
  }, []);

  // Load repository data from localStorage
  const loadRepoData = useCallback((url: string): { gitEvents: any[], specEvents: any[] } | null => {
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
        age: Math.round((Date.now() - data.timestamp) / 1000 / 60) + ' minutes'
      });

      return {
        gitEvents: data.gitEvents,
        specEvents: data.specEvents
      };
    } catch (error) {
      logger.error('storage', 'Failed to load repository data', { error, url });
      return null;
    }
  }, []);

  // Clear repository data
  const clearRepoData = useCallback((url: string) => {
    if (!url) return;

    try {
      localStorage.removeItem(`${REPO_DATA_PREFIX}${url}`);
      logger.info('storage', 'Cleared repository data', { url });
    } catch (error) {
      logger.error('storage', 'Failed to clear repository data', { error, url });
    }
  }, []);

  // Check if repository data exists and is valid
  const hasValidRepoData = useCallback((url: string): boolean => {
    if (!url) return false;

    try {
      const dataStr = localStorage.getItem(`${REPO_DATA_PREFIX}${url}`);
      if (!dataStr) return false;

      const data = JSON.parse(dataStr) as RepositoryData;
      const isValid = Date.now() - data.timestamp <= CACHE_EXPIRATION;
      const hasEvents = data.gitEvents?.length > 0 || data.specEvents?.length > 0;

      logger.info('storage', 'Repository data cache status', {
        url,
        isValid,
        hasEvents,
        isCached: isValid && hasEvents,
        age: Math.round((Date.now() - data.timestamp) / (60 * 60 * 1000)) + ' hours'
      });

      return isValid && hasEvents;
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
    hasValidRepoData
  };
}
