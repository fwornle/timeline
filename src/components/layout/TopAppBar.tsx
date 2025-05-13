import React, { useState } from 'react';
import { configUtils } from '../../config/config';

interface TopAppBarProps {
  className?: string;
  gitRepoUrl?: string;
  specRepoUrl?: string;
  onGitRepoChange?: (url: string) => void;
  onSpecRepoChange?: (url: string) => void;
  animationSpeed?: number;
  onAnimationSpeedChange?: (speed: number) => void;
  autoDrift?: boolean;
  onAutoDriftChange?: (enabled: boolean) => void;
}

interface RepositoryInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  validator: (url: string) => boolean;
  className?: string;
}

function RepositoryInput({
  label,
  placeholder,
  value,
  onChange,
  validator,
  className = '',
}: RepositoryInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempUrl, setTempUrl] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleUrlSubmit = async () => {
    setIsValidating(true);
    setError(null);

    try {
      // Simulate network delay for validation
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!tempUrl.trim()) {
        setError('Repository URL is required');
        return;
      }

      if (!validator(tempUrl)) {
        setError('Invalid repository URL format');
        return;
      }

      onChange(tempUrl);
      setIsEditing(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to validate repository URL');
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUrlSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setTempUrl(value);
      setError(null);
    }
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tempUrl}
              onChange={(e) => {
                setTempUrl(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              className={`flex-grow px-3 py-1.5 border rounded text-sm ${
                error ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-1 focus:ring-blue-500`}
              placeholder={placeholder}
              disabled={isValidating}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setTempUrl(value);
                  setError(null);
                }}
                className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50"
                disabled={isValidating}
              >
                Cancel
              </button>
              <button
                onClick={handleUrlSubmit}
                className={`px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isValidating ? 'cursor-wait' : ''
                }`}
                disabled={isValidating}
              >
                {isValidating ? 'Validating...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 border rounded text-gray-600 hover:border-blue-500 text-sm w-full text-left truncate"
          >
            {value || placeholder}
          </button>
        )}
        {error && (
          <p className="absolute left-0 -bottom-5 text-xs text-red-500">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export function TopAppBar({
  className = '',
  gitRepoUrl = '',
  specRepoUrl = '',
  onGitRepoChange = () => {},
  onSpecRepoChange = () => {},
  animationSpeed = 1,
  onAnimationSpeedChange = () => {},
  autoDrift = false,
  onAutoDriftChange = () => {}
}: TopAppBarProps) {
  return (
    <header className={`bg-white shadow ${className}`}>
      <div className="px-4 py-3 flex items-start justify-between flex-wrap gap-4">
        {/* Repository Configuration */}
        <div className="flex-grow space-y-4 min-w-[300px] max-w-xl">
          <RepositoryInput
            label="Git Repository"
            placeholder="Enter Git repository URL"
            value={gitRepoUrl}
            onChange={onGitRepoChange}
            validator={configUtils.isValidGitUrl}
            className="mb-6"
          />
          <RepositoryInput
            label="Spec Repository"
            placeholder="Enter Spec repository URL"
            value={specRepoUrl}
            onChange={onSpecRepoChange}
            validator={configUtils.isValidSpecUrl}
          />
        </div>

        {/* Controls */}
        <div className="flex items-start gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <label htmlFor="speed" className="text-sm text-gray-600 whitespace-nowrap">
              Speed:
            </label>
            <input
              id="speed"
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={animationSpeed}
              onChange={(e) => onAnimationSpeedChange(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-gray-600 min-w-[2.5rem]">
              {animationSpeed}x
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="drift" className="text-sm text-gray-600">
              Auto-drift
            </label>
            <input
              id="drift"
              type="checkbox"
              checked={autoDrift}
              onChange={() => onAutoDriftChange(!autoDrift)}
              className="rounded text-blue-500"
            />
          </div>
        </div>
      </div>
    </header>
  );
}