import React, { useState, useEffect } from 'react';
import { usePreferences } from '../context/PreferencesContext';
import { Alert } from 'react-bootstrap';
import { TimelineVisualization } from '../components/TimelineVisualization';
import { useLogger } from '../utils/logging/hooks/useLogger';

interface HomeProps {
  onLoadingChange?: (loading: boolean) => void;
  onEventCountsChange?: (gitCount: number, specCount: number) => void;
  onCacheStatusChange?: (isCached: boolean) => void;
  onPositionChange?: (position: number) => void;
  forceReload?: boolean;
}

const Home: React.FC<HomeProps> = ({
  onLoadingChange,
  onEventCountsChange,
  onCacheStatusChange,
  onPositionChange,
  forceReload = false
}) => {
  const logger = useLogger({ component: 'Home', topic: 'ui' });
  const { preferences } = usePreferences();
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [gitCount, setGitCount] = useState(0);
  const [specCount, setSpecCount] = useState(0);
  const [isCached, setIsCached] = useState(false);

  // Get repository URL from preferences
  const repoUrl = preferences.repoUrl || '';
  const animationSpeed = preferences.animationSpeed || 1;
  const autoDrift = preferences.autoDrift || false;

  // Handle loading state changes
  const handleLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
    if (onLoadingChange) {
      onLoadingChange(loading);
    }

    // Log the loading state change
    logger.info('Loading state changed', { loading });
  };

  // Handle errors
  const handleError = (err: Error | null) => {
    setError(err);
  };

  // Update event counts when data is loaded
  useEffect(() => {
    if (onEventCountsChange && (gitCount > 0 || specCount > 0)) {
      onEventCountsChange(gitCount, specCount);
      logger.info('Event counts updated', { gitCount, specCount });
    }
  }, [gitCount, specCount, onEventCountsChange]);

  // Update cache status
  useEffect(() => {
    if (onCacheStatusChange) {
      onCacheStatusChange(isCached);
    }
  }, [isCached, onCacheStatusChange]);

  return (
    <div className="position-relative w-100 h-100 d-flex">
      {!repoUrl ? (
        <div className="text-center py-5 w-100 d-flex flex-column align-items-center justify-content-center">
          <h2 className="mb-4">Welcome to Timeline</h2>
          <p className="lead mb-4">
            Visualize Git repository history in an interactive 3D timeline.
          </p>
          <div className="bg-light p-4 rounded-3 mx-auto" style={{ maxWidth: '600px' }}>
            <h5>Getting Started</h5>
            <p>
              To begin, click the settings icon <i className="bi bi-gear"></i> in the top right corner
              and enter a Git repository URL.
            </p>
            <div className="mt-3">
              <h6>Supported Formats:</h6>
              <ul className="list-unstyled">
                <li className="mb-2">
                  <span className="badge bg-primary me-2">HTTPS</span>
                  <code>https://github.com/username/repo.git</code>
                </li>
                <li className="mb-2">
                  <span className="badge bg-primary me-2">SSH</span>
                  <code>git@github.com:username/repo.git</code>
                </li>
                <li>
                  <span className="badge bg-info me-2">Note</span>
                  Enterprise GitHub instances are also supported
                </li>
              </ul>
            </div>
            <button
              className="btn btn-primary mt-3"
              onClick={() => document.querySelector<HTMLButtonElement>('[aria-label="Repository Settings"]')?.click()}
            >
              <i className="bi bi-gear me-2"></i>
              Configure Repository
            </button>
          </div>
        </div>
      ) : (
        <div className="w-100 h-100 position-absolute top-0 start-0 bottom-0 end-0">
          <TimelineVisualization
            repoUrl={repoUrl}
            animationSpeed={animationSpeed}
            autoDrift={autoDrift}
            onLoadingChange={handleLoadingChange}
            onError={handleError}
            forceReload={forceReload}
            onDataLoaded={(gitEvents, specEvents, isMocked) => {
              setGitCount(gitEvents.length);
              setSpecCount(specEvents.length);
              setIsCached(isMocked);

              // Update parent component with the counts
              if (onEventCountsChange) {
                onEventCountsChange(gitEvents.length, specEvents.length);
              }

              // Update parent component with the cache status
              if (onCacheStatusChange) {
                onCacheStatusChange(isMocked);
              }

              logger.info('Timeline data loaded', {
                gitCount: gitEvents.length,
                specCount: specEvents.length,
                isMocked: isMocked
              });
            }}
            onPositionUpdate={(pos) => {
              if (onPositionChange) {
                onPositionChange(pos);
              }
            }}
          />
        </div>
      )}

      {isLoading && (
        <div className="position-absolute top-0 start-0 w-100 p-3 bg-info text-white">
          <div className="d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <span>Loading repository data...</span>
          </div>
        </div>
      )}

      {/* Error alerts are now handled within the TimelineVisualization component */}
    </div>
  );
};

export default Home;