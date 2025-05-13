import React from 'react';
import { TimelineAPIError } from '../../utils/api/errors';

interface DataSourceState {
  isLoading: boolean;
  error: Error | null;
}

interface BottomAppBarProps {
  className?: string;
  currentPosition?: number;
  sourceStates?: {
    git: DataSourceState;
    spec: DataSourceState;
  };
  onRetry?: (source: 'git' | 'spec') => void;
  onRetryAll?: () => void;
}

export function BottomAppBar({
  className = '',
  currentPosition = 0,
  sourceStates,
  onRetry,
  onRetryAll
}: BottomAppBarProps) {
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

  return (
    <footer className={`bg-white border-t shadow-lg ${className}`}>
      <div className="px-4 h-16 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 min-w-[200px]">
          <span className="text-sm text-gray-600 whitespace-nowrap">
            Position: {currentPosition.toFixed(2)}
          </span>
          {sourceStates && (
            <div className="flex items-center gap-3">
              {sourceStates.git.isLoading && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-600">Git</span>
                </div>
              )}
              {sourceStates.spec.isLoading && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-600">Spec</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {hasErrors && (
          <div className="flex items-center gap-4 text-red-500 flex-grow justify-end">
            {sourceStates.git.error && (
              <div className="flex items-center">
                <svg
                  className="w-4 h-4 mr-2 flex-shrink-0"
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
                <span className="text-sm truncate max-w-[200px]">
                  {formatError(sourceStates.git.error)}
                </span>
                {onRetry && (
                  <button
                    onClick={() => onRetry('git')}
                    className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    Retry Git
                  </button>
                )}
              </div>
            )}
            {sourceStates.spec.error && (
              <div className="flex items-center">
                <svg
                  className="w-4 h-4 mr-2 flex-shrink-0"
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
                <span className="text-sm truncate max-w-[200px]">
                  {formatError(sourceStates.spec.error)}
                </span>
                {onRetry && (
                  <button
                    onClick={() => onRetry('spec')}
                    className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    Retry Spec
                  </button>
                )}
              </div>
            )}
            {onRetryAll && (
              <button
                onClick={onRetryAll}
                className="ml-4 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
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