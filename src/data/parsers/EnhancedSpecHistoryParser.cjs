/**
 * CommonJS wrapper for EnhancedSpecHistoryParser
 * Direct implementation in CommonJS for the Node.js server
 */

/**
 * Parse a spec history file to extract individual prompts
 */
function parseSpecFileToPrompts(filename, content) {
  const fileDate = extractDateFromFilename(filename);
  const prompts = [];
  
  // Split content into lines
  const lines = content.split('\n');
  
  // Find all prompts (lines starting with _**User**_)
  const promptIndices = [];
  lines.forEach((line, index) => {
    if (line.trim().startsWith('_**User**_')) {
      promptIndices.push(index);
    }
  });

  // Process each prompt and its response
  for (let i = 0; i < promptIndices.length; i++) {
    const promptStartIndex = promptIndices[i];
    const promptEndIndex = i < promptIndices.length - 1 ? promptIndices[i + 1] : lines.length;
    
    // Find assistant response start
    const promptSection = lines.slice(promptStartIndex, promptEndIndex);
    const assistantIndex = promptSection.findIndex(line => line.trim().startsWith('_**Assistant**_'));
    
    if (assistantIndex !== -1) {
      // Extract prompt text (between _**User**_ and _**Assistant**_)
      const promptText = promptSection.slice(1, assistantIndex)
        .filter(line => line.trim() !== '' && line.trim() !== '---')
        .join('\n')
        .trim();
      
      // Extract response text
      const responseText = promptSection.slice(assistantIndex + 1)
        .filter(line => line.trim() !== '---')
        .join('\n')
        .trim();
      
      // Parse stats for this specific prompt
      const stats = parsePromptStats(promptSection.slice(assistantIndex));
      
      prompts.push({
        promptText,
        responseText,
        index: i,
        ...stats
      });
    }
  }

  // Calculate total stats
  const totalStats = {
    promptCount: prompts.length,
    filesCreated: prompts.reduce((sum, p) => sum + p.filesCreated, 0),
    filesModified: prompts.reduce((sum, p) => sum + p.filesModified, 0),
    linesAdded: prompts.reduce((sum, p) => sum + p.linesAdded, 0),
    linesDeleted: prompts.reduce((sum, p) => sum + p.linesDeleted, 0),
    linesDelta: prompts.reduce((sum, p) => sum + p.linesDelta, 0),
    toolInvocations: prompts.reduce((sum, p) => sum + p.toolInvocations, 0)
  };

  return {
    filename,
    fileDate,
    prompts,
    totalStats
  };
}

/**
 * Parse stats for a single prompt's assistant response
 */
function parsePromptStats(responseLines) {
  const stats = {
    filesCreated: 0,
    filesModified: 0,
    linesAdded: 0,
    linesDeleted: 0,
    linesDelta: 0,
    toolInvocations: 0
  };

  let inCodeBlock = false;
  let codeBlockType = '';
  let isFileDiff = false;

  for (let i = 0; i < responseLines.length; i++) {
    const line = responseLines[i].trim();

    // Check for code block start
    if (line.startsWith('```') && !inCodeBlock) {
      inCodeBlock = true;
      codeBlockType = line.substring(3).trim();
      
      // Determine block type
      const isFileCreation = codeBlockType !== 'diff' && codeBlockType !== 'bash' && 
                           codeBlockType !== 'shell' && codeBlockType !== '';
      isFileDiff = codeBlockType === 'diff';
      const isToolInvocation = codeBlockType === 'bash' || codeBlockType === 'shell';
      
      if (isFileCreation) {
        stats.filesCreated++;
      } else if (isToolInvocation) {
        stats.toolInvocations++;
      }
      
      continue;
    }

    // Check for code block end
    if (line === '```' && inCodeBlock) {
      inCodeBlock = false;
      isFileDiff = false;
      continue;
    }

    // Count lines in diff blocks
    if (inCodeBlock && isFileDiff) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        stats.linesAdded++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        stats.linesDeleted++;
      }
    }
  }

  // Count modified files (each diff block represents one modified file)
  let diffBlockCount = 0;
  let inDiff = false;
  
  for (let i = 0; i < responseLines.length; i++) {
    const line = responseLines[i].trim();
    
    if (line === '```diff' && !inDiff) {
      inDiff = true;
      diffBlockCount++;
    } else if (line === '```' && inDiff) {
      inDiff = false;
    }
  }
  
  stats.filesModified = diffBlockCount;
  stats.linesDelta = stats.linesAdded - stats.linesDeleted;

  return stats;
}

/**
 * Extract date from specstory filename
 */
function extractDateFromFilename(filename) {
  // Expected format: YYYY-MM-DD-HH-MM-SS-title.md or YYYY-MM-DD_HH-MM-title.md
  let match = filename.match(/^(\d{4})-(\d{2})-(\d{2})[-_](\d{2})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  }
  
  // Try without seconds: YYYY-MM-DD_HH-MM-title.md
  match = filename.match(/^(\d{4})-(\d{2})-(\d{2})[-_](\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      0
    );
  }
  
  // Fallback to date-only format: YYYY-MM-DD-title.md
  const dateMatch = filename.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // If no date found, return current date
  return new Date();
}

/**
 * Correlate spec files with git commits to estimate prompt timings
 */
function correlateSpecFilesWithCommits(specFiles, gitCommits) {
  // Sort spec files and commits by date
  const sortedSpecs = [...specFiles].sort((a, b) => a.fileDate.getTime() - b.fileDate.getTime());
  const sortedCommits = [...gitCommits].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  const bundles = [];
  
  for (let i = 0; i < sortedSpecs.length; i++) {
    const specFile = sortedSpecs[i];
    const nextSpecFile = sortedSpecs[i + 1];
    
    // Find commits that belong to this spec file
    // (after this spec file date and before next spec file date)
    const specCommits = sortedCommits.filter(commit => {
      const afterThisSpec = commit.timestamp.getTime() >= specFile.fileDate.getTime();
      const beforeNextSpec = !nextSpecFile || commit.timestamp.getTime() < nextSpecFile.fileDate.getTime();
      return afterThisSpec && beforeNextSpec;
    });
    
    const firstCommit = specCommits.length > 0 ? specCommits[0] : null;
    const lastCommit = specCommits.length > 0 ? specCommits[specCommits.length - 1] : null;
    
    // Calculate estimated prompt duration
    let estimatedPromptDuration = 0;
    if (firstCommit && lastCommit && specFile.prompts.length > 0) {
      const totalDuration = lastCommit.timestamp.getTime() - firstCommit.timestamp.getTime();
      estimatedPromptDuration = totalDuration / specFile.prompts.length;
    }
    
    bundles.push({
      specFile,
      commits: specCommits,
      firstCommit,
      lastCommit,
      estimatedPromptDuration
    });
  }
  
  return bundles;
}

/**
 * Calculate consistent prompt duration across spec files
 */
function calculateConsistentPromptDuration(bundles) {
  // Filter out bundles with unreliable estimates
  const reliableBundles = bundles.filter(bundle => 
    bundle.estimatedPromptDuration > 0 &&
    bundle.estimatedPromptDuration < 24 * 60 * 60 * 1000 && // Less than 24 hours
    bundle.commits.length > 0 &&
    bundle.specFile.prompts.length > 0
  );
  
  if (reliableBundles.length === 0) {
    // Default to 30 minutes per prompt
    return 30 * 60 * 1000;
  }
  
  // Calculate median duration (more robust than average)
  const durations = reliableBundles.map(b => b.estimatedPromptDuration).sort((a, b) => a - b);
  const midIndex = Math.floor(durations.length / 2);
  
  if (durations.length % 2 === 0) {
    return (durations[midIndex - 1] + durations[midIndex]) / 2;
  } else {
    return durations[midIndex];
  }
}

/**
 * Assign timestamps to individual prompts based on estimated durations
 */
function assignPromptTimestamps(bundles, consistentDuration) {
  return bundles.map(bundle => {
    const { specFile, firstCommit } = bundle;
    
    // Start time is either first commit time or spec file date
    const startTime = firstCommit 
      ? firstCommit.timestamp.getTime()
      : specFile.fileDate.getTime();
    
    // Assign timestamps to each prompt
    const promptsWithTimestamps = specFile.prompts.map((prompt, index) => ({
      ...prompt,
      estimatedTimestamp: new Date(startTime + (index * consistentDuration))
    }));
    
    return {
      ...bundle,
      specFile: {
        ...specFile,
        prompts: promptsWithTimestamps
      }
    };
  });
}

// Export the functions
module.exports = {
  parseSpecFileToPrompts,
  correlateSpecFilesWithCommits,
  calculateConsistentPromptDuration,
  assignPromptTimestamps
};