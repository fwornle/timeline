import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { TimelineProvider } from './context/TimelineContext';
import { ConfigProvider, useConfig } from './config/ConfigContext';
import { useLogger } from './utils/logging/hooks/useLogger';
import { useRepositoryStorage } from './data/hooks/useRepositoryStorage';
import MainPage from './pages/MainPage';
import AboutPage from './pages/AboutPage';
import ErrorBoundary from './components/error/ErrorBoundary';
import './App.css';

function AppContent() {
  const logger = useLogger({ component: 'App', topic: 'ui' });
  const { config } = useConfig();
  const {
    lastRepoUrl,
    saveRepoUrl,
    hasValidRepoData
  } = useRepositoryStorage();

  // App state
  const [repoUrl, setRepoUrl] = useState(lastRepoUrl);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [autoDrift, setAutoDrift] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isCached, setIsCached] = useState(false);

  // Test API connection on startup
  useEffect(() => {
    const testApiConnection = async () => {
      try {
        logger.info('Testing API connection to health endpoint');
        // Use the config's API base URL instead of hardcoding
        const response = await fetch(`${config.apiBaseUrl}/health`);
        const data = await response.json();
        logger.info('API connection successful', { data, apiBaseUrl: config.apiBaseUrl });
      } catch (error) {
        logger.error('API connection failed', { error, apiBaseUrl: config.apiBaseUrl });
      }
    };

    testApiConnection();
  }, [config.apiBaseUrl, logger]);

  // Save repository URL when it changes and check for cached data
  useEffect(() => {
    if (repoUrl && repoUrl !== lastRepoUrl) {
      saveRepoUrl(repoUrl);
      logger.info('Repository URL updated and saved', { repoUrl });

      // Check if we have cached data for this repository
      const cached = hasValidRepoData(repoUrl);
      setIsCached(cached);
      logger.info('Repository cache status checked', { repoUrl, isCached: cached });
    }
  }, [repoUrl, lastRepoUrl, saveRepoUrl, hasValidRepoData, logger, isCached]);

  const handleError = (error: Error | null) => {
    setError(error);
    if (error) {
      logger.error('Timeline error occurred', { error: error.message });
    }
  };

  const handleRepoUrlChange = (url: string) => {
    setRepoUrl(url);
  };

  const handleLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
  };

  return (
    <Router>
      <TimelineProvider>
        <Layout
          repoUrl={repoUrl}
          onRepoUrlChange={handleRepoUrlChange}
          animationSpeed={animationSpeed}
          onAnimationSpeedChange={setAnimationSpeed}
          autoDrift={autoDrift}
          onAutoDriftChange={setAutoDrift}
          isCached={isCached}
        >
          <Routes>
            <Route
              path="/"
              element={
                <MainPage
                  repoUrl={repoUrl}
                  animationSpeed={animationSpeed}
                  autoDrift={autoDrift}
                  onLoadingChange={handleLoadingChange}
                  onError={handleError}
                />
              }
            />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </TimelineProvider>
    </Router>
  );
}

// Wrapper component that provides the ConfigProvider
export function App() {
  return (
    <ConfigProvider>
      <AppContent />
    </ConfigProvider>
  );
}

export default App;
