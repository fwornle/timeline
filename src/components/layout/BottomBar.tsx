import { TimelineAPIError } from '../../utils/api/errors';

interface DataSourceState {
  isLoading: boolean;
  error: Error | null;
}

interface BottomBarProps {
  className?: string;
  currentPosition?: number;
  sourceStates?: {
    git: DataSourceState;
    spec: DataSourceState;
  };
  onRetry?: (source: 'git' | 'spec') => void;
  onRetryAll?: () => void;
  showControls?: boolean;
  isGitHistoryMocked?: boolean;
  isSpecHistoryMocked?: boolean;
  repoUrl?: string;
  animationSpeed: number;
  onAnimationSpeedChange: (speed: number) => void;
  autoDrift: boolean;
  onAutoDriftChange: (enabled: boolean) => void;
}

export function BottomBar({
  className = '',
  currentPosition = 0,
  sourceStates,
  onRetry,
  onRetryAll,
  showControls = false,
  isGitHistoryMocked = false,
  isSpecHistoryMocked = false,
  animationSpeed,
  onAnimationSpeedChange,
  autoDrift,
  onAutoDriftChange
}: BottomBarProps) {
  // Helper to format error messages
  const formatError = (error: Error): string => {
    if (error instanceof TimelineAPIError) {
      return `${error.name}: ${error.message}`;
    }
    return error.message;
  };

  // Determine if there are any errors
  const hasErrors = sourceStates && (
    sourceStates.git.error || sourceStates.spec.error
  );

  // Get commit and prompt counts
  const gitCount = sourceStates?.git.isLoading ? '...' : '0';
  const specCount = sourceStates?.spec.isLoading ? '...' : '0';

  // Always show the bottom bar, even if no controls or errors
  return (
    <footer className={`bg-gray-800 text-gray-300 border-t border-gray-700 shadow-md h-12 w-full ${className}`}>
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-2">
        {showControls ? (
          <div className="flex items-center gap-4 min-w-[200px]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 px-2 py-1 rounded">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="text-xs text-gray-300 whitespace-nowrap">
                  Position: {currentPosition.toFixed(2)}
                </span>
              </div>

              <div className={`flex items-center gap-1 px-2 py-1 rounded ${isGitHistoryMocked ? 'border border-yellow-400' : ''}`}
                   style={{ borderWidth: isGitHistoryMocked ? '2px' : '0' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13 12H3" />
                </svg>
                <span className="text-xs text-gray-300 whitespace-nowrap">
                  Commits: {gitCount}
                </span>
              </div>

              <div className={`flex items-center gap-1 px-2 py-1 rounded ${isSpecHistoryMocked ? 'border border-yellow-400' : ''}`}
                   style={{ borderWidth: isSpecHistoryMocked ? '2px' : '0' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-xs text-gray-300 whitespace-nowrap">
                  Prompts: {specCount}
                </span>
              </div>
            </div>

            {/* Animation Controls */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-2">
                <label htmlFor="speed-slider" className="text-xs text-gray-400">Speed:</label>
                <input
                  id="speed-slider"
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={animationSpeed}
                  onChange={(e) => onAnimationSpeedChange(parseFloat(e.target.value))}
                  className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-300">{animationSpeed.toFixed(1)}x</span>
              </div>

              <button
                onClick={() => onAutoDriftChange(!autoDrift)}
                className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                  autoDrift ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
                  <polygon points="12 15 17 21 7 21 12 15" />
                </svg>
                Auto
              </button>
            </div>

            {sourceStates && (
              <div className="flex items-center gap-2">
                {sourceStates.git.isLoading && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-700">
                    <div className="w-2 h-2 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-indigo-300">Git</span>
                  </div>
                )}
                {sourceStates.spec.isLoading && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-700">
                    <div className="w-2 h-2 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-indigo-300">Spec</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-400">
            Enter a repository URL to begin
          </div>
        )}

        {hasErrors && (
          <div className="flex items-center gap-2 text-red-400 flex-grow justify-end">
            {sourceStates?.git.error && (
              <div className="flex items-center bg-gray-700 px-2 py-1 rounded">
                <svg
                  className="w-3 h-3 mr-1 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-xs truncate max-w-[200px]">
                  {formatError(sourceStates.git.error)}
                </span>
                {onRetry && (
                  <button
                    onClick={() => onRetry('git')}
                    className="ml-2 px-2 py-0.5 text-xs bg-red-700 text-white rounded hover:bg-red-800 transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
            {sourceStates?.spec.error && (
              <div className="flex items-center bg-gray-700 px-2 py-1 rounded">
                <svg
                  className="w-3 h-3 mr-1 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-xs truncate max-w-[200px]">
                  {formatError(sourceStates.spec.error)}
                </span>
                {onRetry && (
                  <button
                    onClick={() => onRetry('spec')}
                    className="ml-2 px-2 py-0.5 text-xs bg-red-700 text-white rounded hover:bg-red-800 transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
            {onRetryAll && (
              <button
                onClick={onRetryAll}
                className="ml-2 px-2 py-0.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
              >
                Retry All
              </button>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}

export default BottomBar;
