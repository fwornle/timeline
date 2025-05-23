/**
 * LoggingControl.tsx
 *
 * UI component for controlling logging levels and categories.
 * Provides radio buttons for log levels and checkboxes for categories.
 */

import React, { useState, useEffect } from 'react';
import { Logger } from '../../utils/logging/Logger';

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

  const handleLevelChange = (level: string, checked: boolean) => {
    const newLevels = new Set(activeLevels);
    if (checked) {
      newLevels.add(level);
    } else {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Logging Configuration</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Log Levels Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-gray-900">Log Levels</h3>
                <div className="space-x-2">
                  <button
                    onClick={handleSelectAllLevels}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    All
                  </button>
                  <button
                    onClick={handleSelectNoLevels}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {(Object.values(Logger.Levels) as string[]).map((level) => (
                  <label key={level} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={activeLevels.has(level)}
                      onChange={(e) => handleLevelChange(level, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`ml-2 text-sm font-medium ${
                      level === Logger.Levels.ERROR ? 'text-red-600' :
                      level === Logger.Levels.WARN ? 'text-orange-600' :
                      level === Logger.Levels.INFO ? 'text-blue-600' :
                      level === Logger.Levels.DEBUG ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      {level}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Log Categories Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-gray-900">Categories</h3>
                <div className="space-x-2">
                  <button
                    onClick={handleSelectAllCategories}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    All
                  </button>
                  <button
                    onClick={handleSelectNoCategories}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(Object.values(Logger.Categories) as string[]).map((category) => (
                  <label key={category} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={activeCategories.has(category)}
                      onChange={(e) => handleCategoryChange(category, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {category}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Active: {activeLevels.size} levels, {activeCategories.size} categories
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
