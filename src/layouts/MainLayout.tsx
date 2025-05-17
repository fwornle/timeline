import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
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
  const [repoUrl, setRepoUrl] = useState(preferences.repoUrl || 'https://github.com/example/repo.git');
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

  // Handle timeline refresh (reset position)
  const handleRefreshTimeline = () => {
    // Reset the position to 0
    setCurrentPosition(0);
    logger.info('Timeline position reset');
  };

  // Handle data reload (purge cache and reload from upstream)
  const handleReloadData = () => {
    // Reset counts
    setGitCount(0);
    setSpecCount(0);
    setIsLoading(true);
    setIsCached(false);

    // Force a refresh of the data
    logger.info('Forcing data reload from upstream repository');

    // The Home component will handle the reload based on the forceReload prop
    // which will be passed through the cloneElement below
  };

  // Create a modified version of children with additional props
  const childrenWithProps = React.Children.map(children, child => {
    // Check if the child is a valid React element
    if (React.isValidElement(child)) {
      // Pass additional props to the child
      return React.cloneElement(child as React.ReactElement<any>, {
        onLoadingChange: handleLoadingChange,
        onEventCountsChange: updateEventCounts,
        onCacheStatusChange: (cached: boolean) => setIsCached(cached),
        onPositionChange: (pos: number) => setCurrentPosition(pos),
        forceReload: repoUrl && handleReloadData !== undefined
      });
    }
    return child;
  });

  return (
    <div className="d-flex flex-column vh-100 p-0 m-0 overflow-hidden">
      <TopBar
        onRepoUrlChange={handleRepoUrlChange}
        onRefreshTimeline={handleRefreshTimeline}
        onReloadData={handleReloadData}
      />
      <main className="flex-grow-1 position-relative p-0 m-0 overflow-hidden">
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