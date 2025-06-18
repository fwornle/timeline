import React from 'react';
import { GitTimelineEvent } from '../../data/types/TimelineEvent';
import { Logger } from '../../utils/logging/Logger';
import { colors } from '../../config/colors';

interface GitDetailsViewProps {
  event: GitTimelineEvent;
}

const GitDetailsView: React.FC<GitDetailsViewProps> = ({ event }) => {
  // Debug logging using proper Logger
  Logger.debug('UI', 'git-details', 'GitDetailsView rendering', {
    eventId: event.id.slice(-20),
    commitHash: event.commitHash.slice(0, 8),
    fileCount: event.files?.length || 0,
    hasStats: !!event.stats,
    authorName: event.authorName,
    files: event.files || [],
    firstFile: event.files?.[0] || null,
    filesArray: event.files,
    filesType: typeof event.files,
    isFilesArray: Array.isArray(event.files)
  });

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString();
  };



  return (
    <div className="p-8 space-y-6">
      {/* Commit Information Card */}
      <div 
        className="rounded-lg p-8 border shadow-lg" 
        style={{ 
          backgroundColor: colors.surface.elevated.dark,
          borderColor: colors.border.dark
        }}
      >
        <h3 
          className="text-lg font-semibold mb-6" 
          style={{ color: colors.text.primary.dark }}
        >
          Commit Information
        </h3>
        <div 
          className="p-4 rounded-md" 
          style={{
            backgroundColor: colors.surface.dark,
            border: `1px solid ${colors.border.dark}`
          }}
        >
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span style={{ color: colors.text.secondary.dark }}>Timestamp:</span>
              <span style={{ color: colors.text.primary.dark }}>
                {formatTimestamp(event.timestamp)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: colors.text.secondary.dark }}>Hash:</span>
              <span 
                className="font-mono text-xs break-all ml-2" 
                style={{ color: colors.accent[400] }}
              >
                {event.commitHash}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: colors.text.secondary.dark }}>Branch:</span>
              <span style={{ color: colors.text.primary.dark }}>
                {event.branch}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: colors.text.secondary.dark }}>Author:</span>
              <span style={{ color: colors.text.primary.dark }}>
                {event.authorName}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: colors.text.secondary.dark }}>Email:</span>
              <span className="ml-2 break-all" style={{ color: colors.text.primary.dark }}>
                {event.authorEmail}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Commit Message Card */}
      <div 
        className="rounded-lg p-8 border shadow-lg" 
        style={{ 
          backgroundColor: colors.surface.elevated.dark,
          borderColor: colors.border.dark
        }}
      >
        <h3 
          className="text-lg font-semibold mb-6" 
          style={{ color: colors.text.primary.dark }}
        >
          Commit Message
        </h3>
        <div 
          className="p-4 rounded-md text-sm leading-relaxed" 
          style={{
            backgroundColor: colors.surface.dark,
            color: colors.text.primary.dark,
            border: `1px solid ${colors.border.dark}`
          }}
        >
          {event.title}
        </div>
        
        {event.description && (
          <div className="mt-4">
            <h4 
              className="text-sm font-medium mb-2" 
              style={{ color: colors.text.secondary.dark }}
            >
              Description
            </h4>
            <div 
              className="p-4 rounded-md text-sm leading-relaxed" 
              style={{
                backgroundColor: colors.surface.dark,
                color: colors.text.primary.dark,
                border: `1px solid ${colors.border.dark}`
              }}
            >
              {event.description}
            </div>
          </div>
        )}
      </div>

      {/* Statistics Card */}
      {event.stats && (
        <div 
          className="rounded-lg p-8 border shadow-lg" 
          style={{ 
            backgroundColor: colors.surface.elevated.dark,
            borderColor: colors.border.dark
          }}
        >
          <h3 
            className="text-lg font-semibold mb-6" 
            style={{ color: colors.text.primary.dark }}
          >
            Statistics
          </h3>
          
          <div 
            className="p-4 rounded-md" 
            style={{
              backgroundColor: colors.surface.dark,
              border: `1px solid ${colors.border.dark}`
            }}
          >
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span style={{ color: colors.text.secondary.dark }}>Files Added:</span>
                  <span 
                    className="px-2 py-1 rounded text-xs font-medium" 
                    style={{ 
                      color: colors.success,
                      backgroundColor: `${colors.success}20`
                    }}
                  >
                    {event.stats.filesAdded || event.stats.filesCreated || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: colors.text.secondary.dark }}>Files Modified:</span>
                  <span 
                    className="px-2 py-1 rounded text-xs font-medium" 
                    style={{ 
                      color: colors.accent[400],
                      backgroundColor: `${colors.accent[400]}20`
                    }}
                  >
                    {event.stats.filesModified}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: colors.text.secondary.dark }}>Files Deleted:</span>
                  <span 
                    className="px-2 py-1 rounded text-xs font-medium" 
                    style={{ 
                      color: colors.error,
                      backgroundColor: `${colors.error}20`
                    }}
                  >
                    {event.stats.filesDeleted}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span style={{ color: colors.text.secondary.dark }}>Lines Added:</span>
                  <span 
                    className="px-2 py-1 rounded text-xs font-medium" 
                    style={{ 
                      color: colors.success,
                      backgroundColor: `${colors.success}20`
                    }}
                  >
                    +{event.stats.linesAdded}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: colors.text.secondary.dark }}>Lines Deleted:</span>
                  <span 
                    className="px-2 py-1 rounded text-xs font-medium" 
                    style={{ 
                      color: colors.error,
                      backgroundColor: `${colors.error}20`
                    }}
                  >
                    -{event.stats.linesDeleted}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: colors.text.secondary.dark }}>Net Change:</span>
                  <span 
                    className="px-2 py-1 rounded text-xs font-medium" 
                    style={{ 
                      color: event.stats.linesDelta >= 0 ? colors.success : colors.error,
                      backgroundColor: event.stats.linesDelta >= 0 ? `${colors.success}20` : `${colors.error}20`
                    }}
                  >
                    {event.stats.linesDelta >= 0 ? '+' : ''}{event.stats.linesDelta}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Files Card */}
      <div 
        className="rounded-lg p-8 border shadow-lg" 
        style={{ 
          backgroundColor: colors.surface.elevated.dark,
          borderColor: colors.border.dark
        }}
      >
        <h3 
          className="text-lg font-semibold mb-6" 
          style={{ color: colors.text.primary.dark }}
        >
          Files
        </h3>
        
        <div 
          className="p-4 rounded-md max-h-64" 
          style={{
            backgroundColor: colors.surface.dark,
            border: `1px solid ${colors.border.dark}`
          }}
        >
          <div className="overflow-y-auto max-h-56">
            {event.files && Array.isArray(event.files) && event.files.length > 0 ? (
              <div className="space-y-2">
                {/* Show all files with ordinal numbers and qualifiers after filename */}
                {event.files.map((file, index) => {
                  const getQualifierInfo = (changeType: string) => {
                    switch (changeType) {
                      case 'added':
                        return { symbol: ' (+)', color: colors.success };
                      case 'modified':
                        return { symbol: ' (~)', color: colors.accent[400] };
                      case 'deleted':
                        return { symbol: ' (-)', color: colors.error };
                      default:
                        return { symbol: ' (?)', color: colors.text.secondary.dark };
                    }
                  };
                  
                  const qualifier = getQualifierInfo(file.changeType);
                  
                  return (
                    <div key={index} className="flex items-start space-x-2 text-sm py-1">
                      <span className="flex-shrink-0" style={{ color: colors.text.secondary.dark }}>
                        [{index + 1}]
                      </span>
                      <div className="flex-1 break-all">
                        <span className="font-mono text-xs" style={{ color: colors.text.primary.dark }}>
                          {file.path}
                        </span>
                        <span className="font-mono text-xs" style={{ color: qualifier.color }}>
                          {qualifier.symbol}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-2xl mb-2" style={{ color: colors.text.secondary.dark }}>📝</div>
                <p className="text-sm" style={{ color: colors.text.secondary.dark }}>No file changes found for this commit</p>
                <p className="text-xs mt-1" style={{ color: colors.text.secondary.dark }}>
                  Files available: {event.files ? `${event.files.length}` : 'undefined'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitDetailsView;