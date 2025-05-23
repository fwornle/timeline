#!/usr/bin/env node

/**
 * Migration script to convert old logger calls to new Logger format
 *
 * Usage: node scripts/migrate-logger.js
 *
 * This script will:
 * 1. Find all files with logger.* calls
 * 2. Convert them to Logger.* calls with appropriate categories
 * 3. Create a backup of each file before modification
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Mapping of old topics to new categories
const topicToCategoryMap = {
  // Core system
  'app': 'LIFECYCLE',
  'lifecycle': 'LIFECYCLE',
  'config': 'CONFIG',
  'startup': 'LIFECYCLE',
  'shutdown': 'LIFECYCLE',

  // UI and interaction
  'ui': 'UI',
  'component': 'UI',
  'interaction': 'UI',
  'user': 'UI',
  'click': 'UI',
  'hover': 'UI',

  // Data and API
  'data': 'DATA',
  'api': 'API',
  'fetch': 'API',
  'request': 'API',
  'response': 'API',
  'http': 'API',
  'ajax': 'API',

  // Git and repository
  'git': 'GIT',
  'repo': 'GIT',
  'repository': 'GIT',
  'commit': 'GIT',
  'branch': 'GIT',
  'clone': 'GIT',

  // Spec and documentation
  'spec': 'SPEC',
  'specification': 'SPEC',
  'docs': 'SPEC',
  'documentation': 'SPEC',

  // Three.js and 3D
  'three': 'THREE',
  '3d': 'THREE',
  'render': 'THREE',
  'scene': 'THREE',
  'mesh': 'THREE',
  'geometry': 'THREE',
  'material': 'THREE',

  // Animation
  'animation': 'ANIMATION',
  'animate': 'ANIMATION',
  'tween': 'ANIMATION',
  'transition': 'ANIMATION',

  // Camera
  'camera': 'CAMERA',
  'view': 'CAMERA',
  'viewport': 'CAMERA',
  'zoom': 'CAMERA',
  'pan': 'CAMERA',

  // Timeline
  'timeline': 'TIMELINE',
  'time': 'TIMELINE',
  'temporal': 'TIMELINE',
  'history': 'TIMELINE',

  // Cards
  'card': 'CARDS',
  'cards': 'CARDS',

  // Events
  'event': 'EVENTS',
  'events': 'EVENTS',
  'listener': 'EVENTS',
  'handler': 'EVENTS',

  // Performance
  'performance': 'PERFORMANCE',
  'perf': 'PERFORMANCE',
  'timing': 'PERFORMANCE',
  'benchmark': 'PERFORMANCE',
  'metrics': 'PERFORMANCE',

  // Server
  'server': 'SERVER',
  'backend': 'SERVER',
  'service': 'SERVER',

  // Authentication
  'auth': 'AUTH',
  'authentication': 'AUTH',
  'login': 'AUTH',
  'credentials': 'AUTH',

  // Cache
  'cache': 'CACHE',
  'storage': 'CACHE',
  'persist': 'CACHE',

  // Default fallback
  'default': 'DEFAULT',
  'general': 'DEFAULT',
  'misc': 'DEFAULT',
  'other': 'DEFAULT'
};

function getCategoryForTopic(topic) {
  const lowerTopic = topic.toLowerCase();

  // Direct match
  if (topicToCategoryMap[lowerTopic]) {
    return topicToCategoryMap[lowerTopic];
  }

  // Partial match
  for (const [key, category] of Object.entries(topicToCategoryMap)) {
    if (lowerTopic.includes(key) || key.includes(lowerTopic)) {
      return category;
    }
  }

  // Default fallback
  return 'DEFAULT';
}

function convertLoggerCall(content) {
  // Pattern to match logger calls: logger.level('topic', 'message', optional_data)
  const loggerPattern = /logger\.(debug|info|warn|error)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`](?:\s*,\s*([^)]+))?\s*\)/g;

  return content.replace(loggerPattern, (match, level, topic, message, data) => {
    const category = getCategoryForTopic(topic);
    const dataParam = data ? `, ${data}` : '';
    return `Logger.${level}(Logger.Categories.${category}, '${message}'${dataParam})`;
  });
}

function addLoggerImport(content) {
  // Check if Logger import already exists
  if (content.includes("from './utils/logging/Logger'") ||
      content.includes("from '../utils/logging/Logger'") ||
      content.includes("from '../../utils/logging/Logger'")) {
    return content;
  }

  // Check if logger import exists and replace it
  const loggerImportPattern = /import\s+{\s*logger[^}]*}\s+from\s+['"`][^'"`]*logger['"`];?/g;

  if (loggerImportPattern.test(content)) {
    return content.replace(loggerImportPattern, (match) => {
      // Determine the correct relative path based on file structure
      const relativePath = match.includes('../../') ? '../../utils/logging/Logger' :
                          match.includes('../') ? '../utils/logging/Logger' :
                          './utils/logging/Logger';
      return `import { Logger } from '${relativePath}';`;
    });
  }

  // If no logger import exists, add it at the top after other imports
  const lines = content.split('\n');
  let insertIndex = 0;

  // Find the last import statement
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      insertIndex = i + 1;
    } else if (lines[i].trim() === '' && insertIndex > 0) {
      // Empty line after imports
      break;
    }
  }

  // Insert the Logger import
  lines.splice(insertIndex, 0, "import { Logger } from './utils/logging/Logger';");
  return lines.join('\n');
}

function processFile(filePath) {
  console.log(`Processing: ${filePath}`);

  const content = fs.readFileSync(filePath, 'utf8');

  // Check if file contains logger calls
  if (!content.includes('logger.')) {
    console.log(`  Skipping: No logger calls found`);
    return;
  }

  // Create backup
  const backupPath = filePath + '.backup';
  fs.writeFileSync(backupPath, content);
  console.log(`  Backup created: ${backupPath}`);

  // Convert logger calls
  let newContent = convertLoggerCall(content);

  // Add Logger import if needed
  newContent = addLoggerImport(newContent);

  // Write the modified content
  fs.writeFileSync(filePath, newContent);
  console.log(`  Converted: ${filePath}`);
}

async function main() {
  console.log('Starting logger migration...\n');

  // Find all TypeScript and JavaScript files in src directory
  const files = await glob('src/**/*.{ts,tsx,js,jsx}', {
    ignore: [
      'src/**/*.test.*',
      'src/**/*.spec.*',
      'src/**/node_modules/**',
      'src/utils/logging/**' // Skip the logging directory itself
    ]
  });

  console.log(`Found ${files.length} files to process\n`);

  files.forEach(processFile);

  console.log('\nMigration complete!');
  console.log('\nNext steps:');
  console.log('1. Review the changes in your files');
  console.log('2. Test the application');
  console.log('3. Remove .backup files when satisfied: rm src/**/*.backup');
  console.log('4. Commit the changes');
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { getCategoryForTopic, convertLoggerCall, addLoggerImport };
