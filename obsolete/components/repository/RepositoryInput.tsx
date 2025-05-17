import React, { useState } from 'react';
import * as configUtils from '../../config/config';

interface RepositoryInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  variant?: 'default' | 'compact';
}

/**
 * A modern, clean repository input component
 * Handles validation and submission of Git repository URLs
 */
export const RepositoryInput: React.FC<RepositoryInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Enter Git repository URL (HTTPS or SSH)',
  variant = 'default',
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setIsValidating(true);
    setError(null);

    try {
      const trimmedUrl = inputValue.trim();

      if (!trimmedUrl) {
        setError('Repository URL is required');
        return;
      }

      if (!configUtils.isValidGitUrl(trimmedUrl)) {
        setError('Invalid repository URL format');
        return;
      }

      onChange(trimmedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const isCompact = variant === 'compact';

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="flex w-full">
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isValidating}
          className={`w-full px-3 ${isCompact ? 'py-1.5' : 'py-2'} bg-white/10 border border-gray-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-300`}
          aria-label="Repository URL"
        />
        {error && (
          <div className="absolute left-0 -bottom-6 text-xs text-red-500 font-medium">
            {error}
          </div>
        )}
        {isValidating && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </form>
    </div>
  );
};

export default RepositoryInput;
