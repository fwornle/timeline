import React from 'react';
import { defaultConfig } from '../config/defaultConfig';

interface StatusBarProps {
  repoUrl: string;
  isLoading: boolean;
  hasError: boolean;
  isCached: boolean;
  onRefresh: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  repoUrl,
  isLoading,
  hasError,
  isCached,
  onRefresh
}) => {
  if (!repoUrl) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-muted text-foreground p-2 flex items-center justify-between z-50 text-sm border-t border-border shadow-lg">
      <div className="flex items-center space-x-4 overflow-hidden">
        <div className="flex items-center">
          <span className="font-medium mr-2">Repository:</span>
          <span className="text-muted-foreground truncate max-w-[200px] md:max-w-md">{repoUrl}</span>
        </div>

        {isCached && (
          <div className="flex items-center text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <span className="whitespace-nowrap">Using cached data</span>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center text-yellow-400">
            <svg className="animate-spin h-4 w-4 mr-1 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="whitespace-nowrap">Loading repository data...</span>
          </div>
        )}

        {hasError && (
          <div className="flex items-center text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="whitespace-nowrap">Error loading data</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 flex-shrink-0">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-3 py-1 bg-primary hover:bg-primary/90 rounded text-xs flex items-center disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
        <button
          onClick={() => {
            // Direct API test
            const testGitApi = async () => {
              try {
                console.log('Testing git history API endpoint');
                const params = new URLSearchParams();
                params.append('repository', repoUrl || 'https://github.com/test/repo.git');
                const response = await fetch(`${defaultConfig.apiBaseUrl}/git/history?${params.toString()}`);
                const data = await response.json();
                console.log('Git history API request successful', { data });
              } catch (error) {
                console.error('Git history API request failed', { error });
              }
            };

            const testSpecsApi = async () => {
              try {
                console.log('Testing specs history API endpoint');
                const params = new URLSearchParams();
                params.append('repository', repoUrl || 'https://github.com/test/repo.git');
                const response = await fetch(`${defaultConfig.apiBaseUrl}/specs/history?${params.toString()}`);
                const data = await response.json();
                console.log('Specs history API request successful', { data });
              } catch (error) {
                console.error('Specs history API request failed', { error });
              }
            };

            testGitApi();
            testSpecsApi();
          }}
          className="px-3 py-1 bg-primary hover:bg-primary/90 rounded text-xs flex items-center text-primary-foreground"
        >
          Test API
        </button>
      </div>
    </div>
  );
};

export default StatusBar;
