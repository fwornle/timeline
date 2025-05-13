import { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { TimelineVisualization } from './components/TimelineVisualization';
import { TimelineProvider } from './context/TimelineContext';
import { ConfigProvider } from './config/ConfigContext';
import { useLogger } from './utils/logging/hooks/useLogger';

export function App() {
  const logger = useLogger({ component: 'App', topic: 'ui' });
  const [repoUrl, setRepoUrl] = useState('');
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [autoDrift, setAutoDrift] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleError = (error: Error | null) => {
    setError(error);
    if (error) {
      logger.error('Timeline error occurred', { error: error.message });
    }
  };

  return (
    <ConfigProvider>
      <TimelineProvider>
        <Layout
          repoUrl={repoUrl}
          onRepoUrlChange={setRepoUrl}
          animationSpeed={animationSpeed}
          onAnimationSpeedChange={setAnimationSpeed}
          autoDrift={autoDrift}
          onAutoDriftChange={setAutoDrift}
        >
          <div className="flex-grow min-h-[500px] bg-gray-900 rounded-lg overflow-hidden relative">
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <p className="text-red-500 text-xl mb-2">Error</p>
                  <p className="text-gray-400">{error.message}</p>
                </div>
              </div>
            ) : (
              <TimelineVisualization
                repoUrl={repoUrl}
                animationSpeed={animationSpeed}
                autoDrift={autoDrift}
                onLoadingChange={setIsLoading}
                onError={handleError}
              />
            )}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500" />
              </div>
            )}
          </div>
        </Layout>
      </TimelineProvider>
    </ConfigProvider>
  );
}

export default App;
