/**
 * Parser for spec history files to extract statistics
 */

interface PromptStats {
  filesCreated: number;
  filesModified: number;
  linesAdded: number;
  linesDeleted: number;
  toolInvocations: number;
}

interface SpecHistoryStats {
  promptCount: number;
  filesCreated: number;
  filesModified: number;
  linesAdded: number;
  linesDeleted: number;
  linesDelta: number;
  toolInvocations: number;
}

/**
 * Parse a spec history file to extract statistics
 * @param content The content of the spec history file
 * @returns Statistics about the spec history
 */
export function parseSpecHistoryStats(content: string): SpecHistoryStats {
  // Initialize stats
  const stats: SpecHistoryStats = {
    promptCount: 0,
    filesCreated: 0,
    filesModified: 0,
    linesAdded: 0,
    linesDeleted: 0,
    linesDelta: 0,
    toolInvocations: 0
  };

  // Split content into lines
  const lines = content.split('\n');
  
  // Find all prompts (lines starting with _**User**_)
  const promptIndices: number[] = [];
  lines.forEach((line, index) => {
    if (line.trim().startsWith('_**User**_')) {
      promptIndices.push(index);
      stats.promptCount++;
    }
  });

  // Process each prompt and its response
  for (let i = 0; i < promptIndices.length; i++) {
    const promptIndex = promptIndices[i];
    const nextPromptIndex = i < promptIndices.length - 1 ? promptIndices[i + 1] : lines.length;
    
    // Extract the response (from _**Assistant**_ to the next prompt or end of file)
    const responseLines = lines.slice(promptIndex, nextPromptIndex);
    const assistantIndex = responseLines.findIndex(line => line.trim().startsWith('_**Assistant**_'));
    
    if (assistantIndex !== -1) {
      const assistantResponse = responseLines.slice(assistantIndex);
      const promptStats = parseAssistantResponse(assistantResponse);
      
      // Add to total stats
      stats.filesCreated += promptStats.filesCreated;
      stats.filesModified += promptStats.filesModified;
      stats.linesAdded += promptStats.linesAdded;
      stats.linesDeleted += promptStats.linesDeleted;
      stats.toolInvocations += promptStats.toolInvocations;
    }
  }

  // Calculate delta
  stats.linesDelta = stats.linesAdded - stats.linesDeleted;

  return stats;
}

/**
 * Parse an assistant response to extract file creation, modification, and tool invocation statistics
 * @param responseLines Lines of the assistant's response
 * @returns Statistics for this response
 */
function parseAssistantResponse(responseLines: string[]): PromptStats {
  const stats: PromptStats = {
    filesCreated: 0,
    filesModified: 0,
    linesAdded: 0,
    linesDeleted: 0,
    toolInvocations: 0
  };

  let inCodeBlock = false;
  let codeBlockType = '';
  let isFileCreation = false;
  let isFileDiff = false;
  let isToolInvocation = false;

  // Process each line
  for (let i = 0; i < responseLines.length; i++) {
    const line = responseLines[i].trim();

    // Check for code block start
    if (line.startsWith('```') && !inCodeBlock) {
      inCodeBlock = true;
      codeBlockType = line.substring(3).trim();
      
      // Determine block type
      isFileCreation = codeBlockType !== 'diff' && codeBlockType !== 'bash' && codeBlockType !== '';
      isFileDiff = codeBlockType === 'diff';
      isToolInvocation = codeBlockType === 'bash' || codeBlockType === 'shell';
      
      // Count file creation or tool invocation
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
      isFileCreation = false;
      isFileDiff = false;
      isToolInvocation = false;
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

  return stats;
}
