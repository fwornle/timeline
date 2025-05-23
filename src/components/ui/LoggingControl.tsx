/**
 * LoggingControl.tsx
 *
 * Professional UI component for controlling logging levels and categories.
 * Features color-coded categories and intelligent level activation logic.
 */

import React, { useState, useEffect } from 'react';
import { Logger } from '../../utils/logging/Logger';
import { loggingColors } from '../../utils/logging/config/loggingColors';

interface LoggingControlProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoggingControl: React.FC<LoggingControlProps> = ({ isOpen, onClose }) => {
  const [activeLevels, setActiveLevels] = useState<Set<string>>(new Set());
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());

  // Load current settings on mount
  useEffect(() => {
    setActiveLevels(Logger.getActiveLevels());
    setActiveCategories(Logger.getActiveCategories());
  }, [isOpen]);

  // Helper function to get level colors
  const getLevelColor = (level: string) => {
    switch (level) {
      case Logger.Levels.ERROR: return '#dc3545'; // Red
      case Logger.Levels.WARN: return '#fd7e14'; // Orange
      case Logger.Levels.INFO: return '#0d6efd'; // Blue
      case Logger.Levels.DEBUG: return '#198754'; // Green
      case Logger.Levels.TRACE: return '#6f42c1'; // Purple
      default: return '#6c757d'; // Gray
    }
  };

  // Helper function to get level descriptions
  const getLevelDescription = (level: string) => {
    switch (level) {
      case Logger.Levels.ERROR: return 'Critical errors and failures';
      case Logger.Levels.WARN: return 'Warnings and potential issues';
      case Logger.Levels.INFO: return 'General information messages';
      case Logger.Levels.DEBUG: return 'Detailed debugging information';
      case Logger.Levels.TRACE: return 'Very detailed execution traces';
      default: return '';
    }
  };

  // Helper function to get category colors
  const getCategoryColor = (category: string) => {
    // Map category names to color keys
    const colorMap: Record<string, string> = {
      'DEFAULT': loggingColors.logDefault,
      'LIFECYCLE': loggingColors.logLifecycle,
      'CONFIG': loggingColors.logConfig,
      'UI': loggingColors.logUi,
      'DATA': loggingColors.logData,
      'API': loggingColors.logApi,
      'CACHE': loggingColors.logCache,
      'GIT': loggingColors.logGit,
      'SPEC': loggingColors.logSpec,
      'THREE': loggingColors.logThree,
      'ANIMATION': loggingColors.logAnimation,
      'CAMERA': loggingColors.logCamera,
      'TIMELINE': loggingColors.logTimeline,
      'CARDS': loggingColors.logCards,
      'EVENTS': loggingColors.logEvents,
      'PERFORMANCE': loggingColors.logPerformance,
      'SERVER': loggingColors.logServer,
      'AUTH': loggingColors.logAuth,
    };
    return colorMap[category] || loggingColors.logDefault;
  };

  const handleLevelChange = (level: string, checked: boolean) => {
    const newLevels = new Set(activeLevels);

    if (checked) {
      // When activating a level, also activate prerequisite levels
      newLevels.add(level);

      // TRACE activates DEBUG and INFO
      if (level === Logger.Levels.TRACE) {
        newLevels.add(Logger.Levels.DEBUG);
        newLevels.add(Logger.Levels.INFO);
      }
      // DEBUG activates INFO
      else if (level === Logger.Levels.DEBUG) {
        newLevels.add(Logger.Levels.INFO);
      }
    } else {
      // When deactivating, only deactivate that specific level
      newLevels.delete(level);
    }

    setActiveLevels(newLevels);
    Logger.setActiveLevels(newLevels);
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    const newCategories = new Set(activeCategories);
    if (checked) {
      newCategories.add(category);
    } else {
      newCategories.delete(category);
    }
    setActiveCategories(newCategories);
    Logger.setActiveCategories(newCategories);
  };

  const handleSelectAllLevels = () => {
    const allLevels = new Set(Object.values(Logger.Levels) as string[]);
    setActiveLevels(allLevels);
    Logger.setActiveLevels(allLevels);
  };

  const handleSelectNoLevels = () => {
    const noLevels = new Set<string>();
    setActiveLevels(noLevels);
    Logger.setActiveLevels(noLevels);
  };

  const handleSelectAllCategories = () => {
    const allCategories = new Set(Object.values(Logger.Categories) as string[]);
    setActiveCategories(allCategories);
    Logger.setActiveCategories(allCategories);
  };

  const handleSelectNoCategories = () => {
    const noCategories = new Set<string>();
    setActiveCategories(noCategories);
    Logger.setActiveCategories(noCategories);
  };

  if (!isOpen) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1050
      }}
    >
      <div
        className="bg-white rounded shadow-lg"
        style={{
          maxWidth: '800px',
          width: '90%',
          maxHeight: '85vh',
          backgroundColor: 'var(--color-surface-elevated-light)'
        }}
      >
        <div className="p-4">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
            <h2
              className="h4 mb-0 fw-semibold"
              style={{ color: 'var(--color-text-primary-light)' }}
            >
              <i className="bi bi-file-text me-2"></i>
              Logging Configuration
            </h2>
            <button
              onClick={onClose}
              className="btn btn-sm btn-outline-secondary"
              style={{ borderRadius: '50%', width: '32px', height: '32px' }}
            >
              <i className="bi bi-x"></i>
            </button>
          </div>

          <div className="row">
            {/* Log Levels Section */}
            <div className="col-md-6 mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3
                  className="h5 mb-0 fw-semibold"
                  style={{ color: 'var(--color-text-primary-light)' }}
                >
                  <i className="bi bi-layers me-2"></i>
                  Log Levels
                </h3>
                <div className="btn-group btn-group-sm">
                  <button
                    onClick={handleSelectAllLevels}
                    className="btn btn-outline-primary btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    All
                  </button>
                  <button
                    onClick={handleSelectNoLevels}
                    className="btn btn-outline-secondary btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="d-flex flex-column gap-2">
                {(Object.values(Logger.Levels) as string[]).map((level) => {
                  const levelColor = getLevelColor(level);
                  const isActive = activeLevels.has(level);
                  return (
                    <div
                      key={level}
                      className="form-check d-flex align-items-center p-2 rounded"
                      style={{
                        backgroundColor: isActive ? `${levelColor}15` : 'transparent',
                        border: `1px solid ${isActive ? levelColor : '#dee2e6'}`,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        id={`level-${level}`}
                        checked={isActive}
                        onChange={(e) => handleLevelChange(level, e.target.checked)}
                        className="form-check-input me-3"
                        style={{
                          accentColor: levelColor,
                          transform: 'scale(1.1)'
                        }}
                      />
                      <label
                        htmlFor={`level-${level}`}
                        className="form-check-label d-flex align-items-center flex-grow-1 mb-0"
                        style={{ cursor: 'pointer' }}
                      >
                        <div
                          className="rounded-circle me-2"
                          style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: levelColor,
                            border: '1px solid rgba(0,0,0,0.1)'
                          }}
                        ></div>
                        <div className="d-flex flex-column">
                          <span
                            className="fw-medium"
                            style={{
                              color: isActive ? levelColor : 'var(--color-text-secondary-light)',
                              fontSize: '0.9rem'
                            }}
                          >
                            {level}
                          </span>
                          <small
                            style={{
                              color: 'var(--color-text-secondary-light)',
                              fontSize: '0.7rem',
                              lineHeight: '1.2'
                            }}
                          >
                            {getLevelDescription(level)}
                          </small>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>

              {/* Cascading Logic Note */}
              <div
                className="mt-3 p-2 rounded"
                style={{
                  backgroundColor: 'var(--color-info-50)',
                  border: '1px solid var(--color-info-200)',
                  fontSize: '0.75rem'
                }}
              >
                <div className="d-flex align-items-start">
                  <i
                    className="bi bi-info-circle me-2 mt-1"
                    style={{ color: 'var(--color-info-600)' }}
                  ></i>
                  <div style={{ color: 'var(--color-info-700)' }}>
                    <strong>Smart Activation:</strong> Enabling TRACE also enables DEBUG + INFO.
                    Enabling DEBUG also enables INFO. Disabling only affects that specific level.
                  </div>
                </div>
              </div>
            </div>

            {/* Log Categories Section */}
            <div className="col-md-6 mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3
                  className="h5 mb-0 fw-semibold"
                  style={{ color: 'var(--color-text-primary-light)' }}
                >
                  <i className="bi bi-tags me-2"></i>
                  Categories
                </h3>
                <div className="btn-group btn-group-sm">
                  <button
                    onClick={handleSelectAllCategories}
                    className="btn btn-outline-primary btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    All
                  </button>
                  <button
                    onClick={handleSelectNoCategories}
                    className="btn btn-outline-secondary btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    None
                  </button>
                </div>
              </div>
              <div
                className="d-flex flex-column gap-1"
                style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  paddingRight: '8px'
                }}
              >
                {(Object.values(Logger.Categories) as string[]).map((category) => {
                  const categoryColor = getCategoryColor(category);
                  const isActive = activeCategories.has(category);
                  return (
                    <div
                      key={category}
                      className="form-check d-flex align-items-center p-2 rounded"
                      style={{
                        backgroundColor: isActive ? `${categoryColor}10` : 'transparent',
                        border: `1px solid ${isActive ? categoryColor : '#dee2e6'}`,
                        transition: 'all 0.2s ease',
                        fontSize: '0.85rem'
                      }}
                    >
                      <input
                        type="checkbox"
                        id={`category-${category}`}
                        checked={isActive}
                        onChange={(e) => handleCategoryChange(category, e.target.checked)}
                        className="form-check-input me-2"
                        style={{
                          accentColor: categoryColor,
                          transform: 'scale(0.9)'
                        }}
                      />
                      <label
                        htmlFor={`category-${category}`}
                        className="form-check-label d-flex align-items-center flex-grow-1 mb-0"
                        style={{ cursor: 'pointer' }}
                      >
                        <div
                          className="rounded me-2"
                          style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: categoryColor,
                            border: '1px solid rgba(0,0,0,0.1)'
                          }}
                        ></div>
                        <span
                          className="fw-medium"
                          style={{
                            color: isActive ? categoryColor : 'var(--color-text-secondary-light)',
                            fontSize: '0.8rem'
                          }}
                        >
                          {category}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
            <div
              className="d-flex align-items-center gap-3"
              style={{
                color: 'var(--color-text-secondary-light)',
                fontSize: '0.85rem'
              }}
            >
              <div className="d-flex align-items-center">
                <i className="bi bi-layers me-1"></i>
                <span className="fw-medium">{activeLevels.size}</span>
                <span className="ms-1">levels</span>
              </div>
              <div className="d-flex align-items-center">
                <i className="bi bi-tags me-1"></i>
                <span className="fw-medium">{activeCategories.size}</span>
                <span className="ms-1">categories</span>
              </div>
              <div className="d-flex align-items-center">
                <i className="bi bi-check-circle me-1" style={{ color: 'var(--color-success)' }}></i>
                <span>Settings auto-saved</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn btn-primary"
              style={{
                backgroundColor: 'var(--color-primary-600)',
                borderColor: 'var(--color-primary-600)',
                padding: '0.5rem 1.5rem'
              }}
            >
              <i className="bi bi-check me-1"></i>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
