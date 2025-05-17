import React, { useState } from 'react';
import { usePreferences } from '../context/PreferencesContext';
import { Alert, Button } from 'react-bootstrap';
import { TimelineVisualization } from '../components/TimelineVisualization';

const Home: React.FC = () => {
  const { preferences } = usePreferences();
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get repository URL from preferences
  const repoUrl = preferences.repoUrl || '';
  const animationSpeed = preferences.animationSpeed || 1;
  const autoDrift = preferences.autoDrift || false;

  // Handle loading state changes
  const handleLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
  };

  // Handle errors
  const handleError = (err: Error | null) => {
    setError(err);
  };

  return (
    <div className="position-relative h-100">
      {!repoUrl ? (
        <div className="text-center py-5">
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
            <Button
              variant="primary"
              className="mt-3"
              onClick={() => document.querySelector<HTMLButtonElement>('[aria-label="Repository Settings"]')?.click()}
            >
              <i className="bi bi-gear me-2"></i>
              Configure Repository
            </Button>
          </div>
        </div>
      ) : (
        <div className="h-100">
          <TimelineVisualization
            repoUrl={repoUrl}
            animationSpeed={animationSpeed}
            autoDrift={autoDrift}
            onLoadingChange={handleLoadingChange}
            onError={handleError}
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

      {error && (
        <Alert
          variant="danger"
          className="position-absolute bottom-0 start-0 m-3"
          style={{ zIndex: 1000, maxWidth: '500px' }}
        >
          <Alert.Heading>Error</Alert.Heading>
          <p>{error.message}</p>
        </Alert>
      )}
    </div>
  );
};

export default Home;