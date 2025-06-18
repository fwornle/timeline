import React from 'react';
import { SpecTimelineEvent } from '../../data/types/TimelineEvent';
import { Logger } from '../../utils/logging/Logger';
import { colors } from '../../config/colors';

interface SpecDetailsViewProps {
  event: SpecTimelineEvent;
}

const SpecDetailsView: React.FC<SpecDetailsViewProps> = ({ event }) => {
  // Debug logging using proper Logger
  Logger.debug('UI', 'spec-details', 'SpecDetailsView rendering', {
    eventId: event.id.slice(-20),
    hasStats: !!event.stats,
    hasFullPromptText: !!event.fullPromptText,
    toolInvocations: event.stats?.toolInvocations,
    hasToolTypes: !!event.stats?.toolTypes,
    hasToolCategories: !!event.stats?.toolCategories
  });

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderToolCategories = () => {
    if (!event.stats?.toolCategories) return null;

    const categories = event.stats.toolCategories;
    const total = categories.search + categories.action + categories.read + categories.write;
    
    if (total === 0) return null;

    return (
      <div className="space-y-2">
        <h4 
          className="text-sm font-medium" 
          style={{ color: colors.text.secondary.dark }}
        >
          Tool Categories
        </h4>
        <div className="space-y-1">
          {categories.search > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: colors.accent[400] }}>Search Tools:</span>
              <span style={{ color: colors.text.primary.dark }}>{categories.search}</span>
            </div>
          )}
          {categories.read > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: colors.success }}>Read Tools:</span>
              <span style={{ color: colors.text.primary.dark }}>{categories.read}</span>
            </div>
          )}
          {categories.write > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: colors.warning }}>Write Tools:</span>
              <span style={{ color: colors.text.primary.dark }}>{categories.write}</span>
            </div>
          )}
          {categories.action > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: colors.primary[400] }}>Action Tools:</span>
              <span style={{ color: colors.text.primary.dark }}>{categories.action}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderToolTypes = () => {
    if (!event.stats?.toolTypes || Object.keys(event.stats.toolTypes).length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 
          className="text-sm font-medium" 
          style={{ color: colors.text.secondary.dark }}
        >
          Specific Tools Used
        </h4>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {Object.entries(event.stats.toolTypes)
            .sort(([,a], [,b]) => b - a)
            .map(([tool, count]) => (
              <div key={tool} className="flex justify-between text-sm">
                <span style={{ color: colors.text.secondary.dark }}>{tool}:</span>
                <span style={{ color: colors.text.primary.dark }}>{count}</span>
              </div>
            ))
          }
        </div>
      </div>
    );
  };

  const renderWorkflowPatterns = () => {
    if (!event.stats?.workflowPatterns || event.stats.workflowPatterns.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 
          className="text-sm font-medium" 
          style={{ color: colors.text.secondary.dark }}
        >
          Workflow Patterns
        </h4>
        <div className="space-y-1">
          {event.stats.workflowPatterns.map((pattern, index) => (
            <span
              key={index}
              className="inline-block px-2 py-1 text-xs rounded-full mr-1 mb-1"
              style={{
                backgroundColor: colors.accent[600],
                color: colors.accent[100]
              }}
            >
              {pattern}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderToolPatterns = () => {
    if (!event.stats?.toolPatterns) return null;

    const patterns = event.stats.toolPatterns;
    const activePatterns = Object.entries(patterns).filter(([, active]) => active);
    
    if (activePatterns.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 
          className="text-sm font-medium" 
          style={{ color: colors.text.secondary.dark }}
        >
          Development Phases
        </h4>
        <div className="space-y-1">
          {activePatterns.map(([phase]) => (
            <span
              key={phase}
              className="inline-block px-2 py-1 text-xs rounded-full mr-1 mb-1"
              style={{
                backgroundColor: colors.success,
                color: colors.surface.light
              }}
            >
              {phase.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, str => str.toUpperCase())}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6">
      
      {/* Basic Information Card */}
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
          Basic Information
        </h3>
        <div 
          className="p-4 rounded-md text-sm leading-relaxed space-y-3" 
          style={{
            backgroundColor: colors.surface.dark,
            color: colors.text.primary.dark,
            border: `1px solid ${colors.border.dark}`
          }}
        >
          <div className="flex">
            <span className="w-24 flex-shrink-0 font-medium" style={{ color: colors.text.secondary.dark }}>Timestamp:</span>
            <span style={{ color: colors.text.primary.dark }}>
              {formatTimestamp(event.timestamp)}
            </span>
          </div>
          <div className="flex">
            <span className="w-24 flex-shrink-0 font-medium" style={{ color: colors.text.secondary.dark }}>Spec ID:</span>
            <span 
              className="font-mono text-xs break-all" 
              style={{ color: colors.accent[400] }}
            >
              {event.specId}
            </span>
          </div>
          <div className="flex">
            <span className="w-24 flex-shrink-0 font-medium" style={{ color: colors.text.secondary.dark }}>Version:</span>
            <span style={{ color: colors.text.primary.dark }}>
              {event.version}
            </span>
          </div>
        </div>
      </div>

      {/* Title & Description Card */}
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
          Content
        </h3>
        <div className="space-y-4">
          <div>
            <h4 
              className="text-sm font-medium mb-2" 
              style={{ color: colors.text.secondary.dark }}
            >
              Title
            </h4>
            <div 
              className="p-4 rounded-md text-sm leading-relaxed" 
              style={{
                backgroundColor: colors.surface.dark,
                border: `1px solid ${colors.border.dark}`,
                color: colors.text.primary.dark
              }}
            >
              {event.title}
            </div>
          </div>
          
          {event.description && (
            <div>
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
                  border: `1px solid ${colors.border.dark}`,
                  color: colors.text.primary.dark
                }}
              >
                {event.description}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Prompt Text */}
      {event.fullPromptText && (
        <div>
          <h4 
            className="text-sm font-medium mb-2" 
            style={{ color: colors.text.secondary.dark }}
          >
            Full Prompt
          </h4>
          <div 
            className="p-4 rounded-lg text-sm max-h-64 overflow-y-auto" 
            style={{
              backgroundColor: colors.surface.elevated.dark,
              border: `1px solid ${colors.border.dark}`,
              color: colors.text.primary.dark
            }}
          >
            <pre className="whitespace-pre-wrap break-words font-mono">{event.fullPromptText}</pre>
          </div>
        </div>
      )}

      {/* Full Response Text */}
      {event.fullResponseText && (
        <div>
          <h4 
            className="text-sm font-medium mb-2" 
            style={{ color: colors.text.secondary.dark }}
          >
            Assistant Response
          </h4>
          <div 
            className="p-4 rounded-lg text-sm max-h-64 overflow-y-auto" 
            style={{
              backgroundColor: colors.surface.elevated.dark,
              border: `1px solid ${colors.border.dark}`,
              color: colors.text.primary.dark
            }}
          >
            <pre className="whitespace-pre-wrap break-words font-mono">{event.fullResponseText}</pre>
          </div>
        </div>
      )}

      {/* Statistics */}
      {event.stats && (
        <div className="space-y-4">
          <h3 
            className="text-lg font-semibold" 
            style={{ color: colors.text.primary.dark }}
          >
            Statistics
          </h3>
          
          {/* Basic Stats */}
          <div 
            className="p-4 rounded-md" 
            style={{
              backgroundColor: colors.surface.dark,
              border: `1px solid ${colors.border.dark}`
            }}
          >
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span style={{ color: colors.text.secondary.dark }}>Prompts:</span>
                  <span style={{ color: colors.text.primary.dark }}>{event.stats.promptCount}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: colors.text.secondary.dark }}>Tool Invocations:</span>
                  <span style={{ color: colors.text.primary.dark }}>{event.stats.toolInvocations}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: colors.text.secondary.dark }}>Files Created:</span>
                  <span style={{ color: colors.text.primary.dark }}>{event.stats.filesCreated}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span style={{ color: colors.text.secondary.dark }}>Files Modified:</span>
                  <span style={{ color: colors.text.primary.dark }}>{event.stats.filesModified}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: colors.text.secondary.dark }}>Lines Added:</span>
                  <span style={{ color: colors.success }}>+{event.stats.linesAdded}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: colors.text.secondary.dark }}>Lines Deleted:</span>
                  <span style={{ color: colors.error }}>-{event.stats.linesDeleted}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Analytics */}
          <div 
            className="space-y-4 pt-4" 
            style={{ borderTop: `1px solid ${colors.border.dark}` }}
          >
            <h4 
              className="text-lg font-medium" 
              style={{ color: colors.text.primary.dark }}
            >
              Enhanced Analytics
            </h4>
            
            {renderToolCategories()}
            {renderToolTypes()}
            {renderToolPatterns()}
            {renderWorkflowPatterns()}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecDetailsView;