import React, { useState, useEffect } from 'react';

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (repoUrl: string, username?: string, password?: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  error = null,
}) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isHttps, setIsHttps] = useState(false);

  // Check if the URL is HTTPS to determine if we need auth fields
  useEffect(() => {
    setIsHttps(repoUrl.startsWith('http'));
  }, [repoUrl]);

  // Load last repo URL from localStorage
  useEffect(() => {
    if (isOpen) {
      const lastRepo = localStorage.getItem('last-repo-url');
      if (lastRepo) {
        setRepoUrl(lastRepo);
        setIsHttps(lastRepo.startsWith('http'));
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Save repo URL to localStorage
    if (repoUrl) {
      localStorage.setItem('last-repo-url', repoUrl);
    }

    // Only pass username/password for HTTPS URLs
    if (isHttps) {
      onSubmit(repoUrl, username, password);
    } else {
      onSubmit(repoUrl);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-2">Repository Settings</h2>
        <p className="text-gray-600 mb-4 text-sm">
          Enter a Git repository URL to visualize its history.
          {isHttps && " Authentication is required for HTTPS repositories."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="bg-red-50 text-red-600 p-2 rounded text-xs">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="repoUrl" className="block text-xs font-medium text-gray-700 mb-1">
              Repository URL
            </label>
            <input
              id="repoUrl"
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="e.g., https://github.com/username/repo.git"
              className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Supports HTTPS, SSH, and local repository paths
            </p>
          </div>

          {isHttps && (
            <>
              <div>
                <label htmlFor="username" className="block text-xs font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  required
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-gray-700 bg-gray-100 rounded text-xs hover:bg-gray-200 focus:outline-none"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-white bg-blue-600 rounded text-xs hover:bg-blue-700 focus:outline-none disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthDialog;
