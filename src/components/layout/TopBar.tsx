import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import AuthDialog from '../auth/AuthDialog';
import { LoggingControl } from '../ui/LoggingControl';

interface TopBarProps {
  className?: string;
  onRepoUrlChange: (url: string) => void;
  // These props are received but not used in this component
  // They are used in the Layout component
  onAnimationSpeedChange?: (speed: number) => void;
  onAutoDriftChange?: (enabled: boolean) => void;
}

export function TopBar({
  className = '',
  onRepoUrlChange,
}: TopBarProps) {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showLoggingControl, setShowLoggingControl] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuthSubmit = (repoUrl: string, username?: string, password?: string) => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      // Update the repository URL
      onRepoUrlChange(repoUrl);

      // If username and password are provided, store them
      if (username && password && repoUrl.startsWith('http')) {
        const credentials = btoa(`${username}:${password}`);
        localStorage.setItem('git-credentials', credentials);
      }

      setShowAuthDialog(false);
    } catch {
      // Just catch any errors and show a generic message
      setAuthError('Failed to save settings');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthClose = () => {
    setShowAuthDialog(false);
    setAuthError(null);
  };

  return (
    <>
      <Disclosure as="nav" className={`bg-gray-800 ${className}`}>
        {({ open }) => (
          <>
            <div className="mx-auto px-2 sm:px-6 lg:px-8">
              <div className="relative flex h-16 items-center justify-between">
                <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                  {/* Mobile menu button*/}
                  <DisclosureButton className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <XMarkIcon className="block h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Bars3Icon className="block h-5 w-5" aria-hidden="true" />
                    )}
                  </DisclosureButton>
                </div>

                <div className="flex flex-1 items-center justify-start sm:items-stretch">
                  {/* Logo and Title */}
                  <Link to="/about" className="flex flex-shrink-0 items-center">
                    <div className="h-8 w-8 bg-indigo-500 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
                      </svg>
                    </div>
                    <h1 className="ml-2 text-xl font-bold text-white">Timeline</h1>
                  </Link>
                </div>

                {/* Control Buttons */}
                <div className="absolute inset-y-0 right-0 flex items-center space-x-2 pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                  {/* Logging Control Button */}
                  <button
                    type="button"
                    className="rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                    onClick={() => setShowLoggingControl(true)}
                    title="Logging Configuration"
                  >
                    <span className="sr-only">Open logging configuration</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>

                  {/* Settings Button */}
                  <button
                    type="button"
                    className="rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                    onClick={() => setShowAuthDialog(true)}
                    title="Repository Settings"
                  >
                    <span className="sr-only">Open settings</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile menu */}
            <DisclosurePanel className="sm:hidden">
              <div className="space-y-1 px-2 pb-3 pt-2">
                <Link
                  to="/"
                  className="block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-gray-700"
                >
                  Timeline
                </Link>
                <Link
                  to="/about"
                  className="block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-gray-700"
                >
                  About
                </Link>
              </div>
            </DisclosurePanel>
          </>
        )}
      </Disclosure>

      {/* Authentication Dialog */}
      <AuthDialog
        isOpen={showAuthDialog}
        onClose={handleAuthClose}
        onSubmit={handleAuthSubmit}
        isLoading={authLoading}
        error={authError}
      />

      {/* Logging Control Dialog */}
      <LoggingControl
        isOpen={showLoggingControl}
        onClose={() => setShowLoggingControl(false)}
      />
    </>
  );
}

// Icon components
function Bars3Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function XMarkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default TopBar;
