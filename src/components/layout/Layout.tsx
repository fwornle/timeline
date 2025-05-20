import React from 'react';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';
import { useTimelineData } from '../../data/hooks/useTimelineData';

interface LayoutProps {
  children: React.ReactNode;
  repoUrl: string;
  onRepoUrlChange: (url: string) => void;
  animationSpeed: number;
  onAnimationSpeedChange: (speed: number) => void;
  autoDrift: boolean;
  onAutoDriftChange: (enabled: boolean) => void;
  isGitHistoryMocked?: boolean;
  isSpecHistoryMocked?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  repoUrl,
  onRepoUrlChange,
  animationSpeed,
  onAnimationSpeedChange,
  autoDrift,
  onAutoDriftChange,
  isGitHistoryMocked = false,
  isSpecHistoryMocked = false,
}) => {
  // Determine if controls should be shown (only when repository URL is provided)
  const showControls = Boolean(repoUrl);

  // Get timeline data state for bottom bar
  const { sources, refresh } = useTimelineData(repoUrl);

  return (
    <div className="min-h-screen flex flex-col relative bg-gray-900">
      <TopBar
        className="z-10"
        onRepoUrlChange={onRepoUrlChange}
        onAnimationSpeedChange={onAnimationSpeedChange}
        onAutoDriftChange={onAutoDriftChange}
      />

      <main className="flex-1 pt-4 pb-16 w-full px-4 md:px-6 lg:px-8 max-w-screen-2xl mx-auto">
        {children}
      </main>

      <BottomBar
        className="fixed bottom-0 left-0 right-0 z-10"
        showControls={showControls}
        sourceStates={sources}
        onRetry={() => refresh(true)}
        onRetryAll={() => refresh(true)}
        repoUrl={repoUrl}
        isGitHistoryMocked={isGitHistoryMocked}
        isSpecHistoryMocked={isSpecHistoryMocked}
        animationSpeed={animationSpeed}
        onAnimationSpeedChange={onAnimationSpeedChange}
        autoDrift={autoDrift}
        onAutoDriftChange={onAutoDriftChange}
      />
    </div>
  );
};

export default Layout;