import React, { ReactNode, useState, useEffect } from 'react';
import TopBar from '../components/TopBar';
import BottomBar from '../components/BottomBar';
import { usePreferences } from '../context/PreferencesContext';
import { useLogger } from '../utils/logging/hooks/useLogger';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const logger = useLogger({ component: 'MainLayout', topic: 'ui' });
  const { preferences, setPreferences } = usePreferences();
  const [repoUrl, setRepoUrl] = useState(preferences.repoUrl || '');
  const [animationSpeed, setAnimationSpeed] = useState(preferences.animationSpeed || 1);
  const [autoDrift, setAutoDrift] = useState(preferences.autoDrift || false);
  const [gitCount, setGitCount] = useState(0);
  const [specCount, setSpecCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);

  // Update preferences when state changes
  useEffect(() => {
    setPreferences({
      ...preferences,
      repoUrl,
      animationSpeed,
      autoDrift
    });
  }, [repoUrl, animationSpeed, autoDrift]);

  // Handle repository URL change
  const handleRepoUrlChange = (url: string) => {
    setRepoUrl(url);
    // Reset counts when repo changes
    setGitCount(0);
    setSpecCount(0);
    setIsLoading(true);
    setIsCached(false);
    logger.info('Repository URL changed', { url });
  };

  // Handle loading state change from TimelineVisualization
  const handleLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
    logger.info('Loading state changed', { loading });
  };

  // Update event counts when data is loaded
  const updateEventCounts = (gitEvents: number, specEvents: number) => {
    setGitCount(gitEvents);
    setSpecCount(specEvents);
    logger.info('Event counts updated', { gitEvents, specEvents });
  };

  // These will be updated by the TimelineVisualization component
  // through the BottomBar props

  // Create a modified version of children with additional props
  const childrenWithProps = React.Children.map(children, child => {
    // Check if the child is a valid React element
    if (React.isValidElement(child)) {
      // Pass additional props to the child
      return React.cloneElement(child, {
        onLoadingChange: handleLoadingChange,
        onEventCountsChange: updateEventCounts,
        onCacheStatusChange: (cached: boolean) => setIsCached(cached),
        onPositionChange: (pos: number) => setCurrentPosition(pos)
      });
    }
    return child;
  });

  return (
    <div className="d-flex flex-column min-vh-100 p-0 m-0 overflow-hidden">
      <TopBar onRepoUrlChange={handleRepoUrlChange} />
      <main className="flex-fill container-fluid my-4">
        {childrenWithProps}
      </main>
      <BottomBar
        gitCount={gitCount}
        specCount={specCount}
        isLoading={isLoading}
        isCached={isCached}
        currentPosition={currentPosition}
        animationSpeed={animationSpeed}
        autoDrift={autoDrift}
        onAnimationSpeedChange={setAnimationSpeed}
        onAutoDriftChange={setAutoDrift}
      />
    </div>
  );
};

export default MainLayout;