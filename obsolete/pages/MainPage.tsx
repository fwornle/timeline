import React, { useState } from 'react';
import { TimelineVisualization } from '../components/TimelineVisualization';
import ErrorBoundary from '../components/error/ErrorBoundary';
import { useLogger } from '../utils/logging/hooks/useLogger';

interface MainPageProps {
  repoUrl: string;
  animationSpeed: number;
  autoDrift: boolean;
  onLoadingChange: (isLoading: boolean) => void;
  onError: (error: Error | null) => void;
}

const MainPage: React.FC<MainPageProps> = ({
  repoUrl,
  animationSpeed,
  autoDrift,
  onLoadingChange,
  onError,
}) => {
  const logger = useLogger({ component: 'MainPage', topic: 'ui' });
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleError = (err: Error | null) => {
    setError(err);
    onError(err);
  };

  const handleLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
    onLoadingChange(loading);
  };

  return (
    <div className="flex-grow min-h-[600px] bg-card/30 backdrop-blur-sm rounded-xl overflow-hidden relative border border-border shadow-xl">
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-foreground">
          <div className="text-center bg-card/60 backdrop-blur-md p-8 rounded-xl border border-red-900/50 max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-400 text-xl font-bold mb-3">Error</p>
            <p className="text-muted-foreground">{error.message}</p>
            <button
              onClick={() => handleError(null)}
              className="mt-4 px-4 py-2 bg-red-900/30 text-red-300 rounded-md hover:bg-red-900/50 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : (
        <ErrorBoundary
          onError={(err, errorInfo) => {
            // Log detailed error information
            logger.error('Error caught by boundary', {
              error: {
                message: err.message,
                name: err.name,
                stack: err.stack
              },
              componentStack: errorInfo.componentStack
            });

            // Set the error in the app state
            handleError(err);
          }}
          fallback={(err, resetError) => (
            <div className="absolute inset-0 flex items-center justify-center text-foreground">
              <div className="text-center bg-card/60 backdrop-blur-md p-8 rounded-xl border border-red-900/50 max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                    <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-400 text-xl font-bold mb-3">Something went wrong</p>
                <p className="text-muted-foreground mb-2">{err.message}</p>
                {err.name === 'Error' && err.message.includes('hooks') && (
                  <div className="bg-red-900/20 p-3 rounded text-xs text-red-300 mb-4 text-left">
                    <p className="font-medium mb-1">React Hook Error</p>
                    <p>This is likely due to a problem with the React component rendering.
                    Resetting the URL should fix the issue.</p>
                  </div>
                )}
                <div className="flex gap-3 mt-4 justify-center">
                  <button
                    onClick={() => {
                      resetError();
                      handleError(null);
                    }}
                    className="px-4 py-2 bg-red-900/30 text-red-300 rounded-md hover:bg-red-900/50 transition-colors"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}
        >
          {!repoUrl ? (
            <WelcomeMessage />
          ) : (
            <TimelineVisualization
              repoUrl={repoUrl}
              animationSpeed={animationSpeed}
              autoDrift={autoDrift}
              onLoadingChange={handleLoadingChange}
              onError={handleError}
            />
          )}
        </ErrorBoundary>
      )}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-4 border-t-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-primary/20" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Separate Welcome component to avoid conditional rendering issues
const WelcomeMessage: React.FC = () => (
  <div className="absolute inset-0 flex items-center justify-center text-foreground">
    <div className="text-center max-w-md px-6 py-8 bg-card/40 backdrop-blur-md rounded-xl shadow-xl border border-border">
      <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
        </svg>
      </div>
      <h2 className="text-3xl font-bold mb-4 text-white">Welcome to Timeline</h2>
      <p className="text-gray-300 mb-6 text-lg">
        Please click the settings icon in the top right corner to enter a Git repository URL.
      </p>
      <div className="bg-gray-800/50 p-5 rounded-lg text-left text-sm border border-gray-700">
        <p className="mb-3 text-white font-medium">Supported formats:</p>
        <ul className="space-y-2 text-gray-300">
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">1</span>
            <span>HTTPS: <code className="px-1.5 py-0.5 bg-indigo-500/10 rounded text-indigo-400">https://github.com/username/repo.git</code></span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">2</span>
            <span>SSH: <code className="px-1.5 py-0.5 bg-indigo-500/10 rounded text-indigo-400">git@github.com:username/repo.git</code></span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">3</span>
            <span>Local: <code className="px-1.5 py-0.5 bg-indigo-500/10 rounded text-indigo-400">/path/to/local/repo</code></span>
          </li>
        </ul>
      </div>
    </div>
  </div>
);

export default MainPage;
