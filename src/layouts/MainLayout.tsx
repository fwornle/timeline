import React, { ReactNode, useState, useEffect } from 'react';
import TopBar from '../components/TopBar';
import BottomBar from '../components/BottomBar';
import { usePreferences } from '../context/PreferencesContext';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
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
  };

  // These would be updated by the TimelineVisualization component
  // For now, we'll simulate some data for demonstration
  useEffect(() => {
    if (repoUrl) {
      const timer = setTimeout(() => {
        setGitCount(Math.floor(Math.random() * 100) + 20);
        setSpecCount(Math.floor(Math.random() * 50) + 10);
        setIsLoading(false);
        setIsCached(Math.random() > 0.5);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [repoUrl]);

  // Simulate position changes
  useEffect(() => {
    if (repoUrl && autoDrift) {
      const interval = setInterval(() => {
        setCurrentPosition(prev => {
          const newPos = prev + 0.01 * animationSpeed;
          return newPos > 100 ? 0 : newPos;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [repoUrl, autoDrift, animationSpeed]);

  return (
    <div className="d-flex flex-column min-vh-100 p-0 m-0 overflow-hidden">
      <TopBar onRepoUrlChange={handleRepoUrlChange} />
      <main className="flex-fill container-fluid my-4">
        {children}
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