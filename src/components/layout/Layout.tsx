import React from 'react';
import { TopAppBar } from './TopAppBar';
import { BottomAppBar } from './BottomAppBar';

interface LayoutProps {
  children: React.ReactNode;
  repoUrl: string;
  onRepoUrlChange: (url: string) => void;
  animationSpeed: number;
  onAnimationSpeedChange: (speed: number) => void;
  autoDrift: boolean;
  onAutoDriftChange: (enabled: boolean) => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  repoUrl,
  onRepoUrlChange,
  animationSpeed,
  onAnimationSpeedChange,
  autoDrift,
  onAutoDriftChange,
}) => {
  return (
    <div className="min-h-screen flex flex-col relative">
      <TopAppBar
        className="fixed top-0 left-0 right-0 z-10"
        repoUrl={repoUrl}
        onRepoUrlChange={onRepoUrlChange}
        animationSpeed={animationSpeed}
        onAnimationSpeedChange={onAnimationSpeedChange}
        autoDrift={autoDrift}
        onAutoDriftChange={onAutoDriftChange}
      />
      
      <main className="flex-1 mt-16 mb-16 w-full">
        {children}
      </main>

      <BottomAppBar className="fixed bottom-0 left-0 right-0 z-10" />
    </div>
  );
};

export default Layout;