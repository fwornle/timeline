/**
 * Parser for git history to extract statistics
 */

/**
 * Parse git commit data to extract statistics
 * @param {Object} commit The commit object with files array
 * @returns {Object} Statistics about the commit
 */
function parseGitCommitStats(commit) {
  // Initialize stats
  const stats = {
    filesCreated: 0,
    filesModified: 0,
    filesDeleted: 0,
    totalFilesChanged: 0,
    linesAdded: 0,
    linesDeleted: 0,
    linesDelta: 0
  };

  // Count file changes by type
  if (commit.files && Array.isArray(commit.files)) {
    commit.files.forEach(file => {
      stats.totalFilesChanged++;
      
      if (file.changeType === 'added') {
        stats.filesCreated++;
      } else if (file.changeType === 'modified') {
        stats.filesModified++;
      } else if (file.changeType === 'deleted') {
        stats.filesDeleted++;
      }
    });
  }

  // For a more accurate line count, we would need to analyze the diff content
  // This would require additional git commands to get the diff for each commit
  // For now, we'll estimate based on the number of files changed
  stats.linesAdded = estimateLinesChanged(stats.filesCreated, stats.filesModified);
  stats.linesDeleted = estimateLinesChanged(0, stats.filesModified, stats.filesDeleted);
  stats.linesDelta = stats.linesAdded - stats.linesDeleted;

  return stats;
}

/**
 * Estimate lines changed based on file counts
 * This is a very rough estimate and should be replaced with actual diff analysis
 * @param {number} created Number of files created
 * @param {number} modified Number of files modified
 * @param {number} deleted Number of files deleted (optional)
 * @returns {number} Estimated lines changed
 */
function estimateLinesChanged(created, modified, deleted = 0) {
  // Rough estimates: 
  // - New file: ~50 lines
  // - Modified file: ~20 lines
  // - Deleted file: ~50 lines
  return (created * 50) + (modified * 20) + (deleted * 50);
}

/**
 * Get more accurate line statistics for a commit by analyzing the diff
 * @param {string} repoPath Path to the repository
 * @param {string} commitHash The commit hash
 * @returns {Promise<Object>} Statistics about the lines changed
 */
async function getCommitDiffStats(repoPath, commitHash) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    // Get the diff stats for the commit
    const { stdout } = await execAsync(`cd ${repoPath} && git show --numstat ${commitHash}`);
    
    // Parse the output to get line counts
    const stats = {
      linesAdded: 0,
      linesDeleted: 0,
      linesDelta: 0
    };

    // Each line of numstat output is: <added> <deleted> <file>
    const lines = stdout.split('\n');
    for (const line of lines) {
      const match = line.match(/^(\d+)\s+(\d+)\s+(.+)$/);
      if (match) {
        const [, added, deleted] = match;
        stats.linesAdded += parseInt(added, 10);
        stats.linesDeleted += parseInt(deleted, 10);
      }
    }

    stats.linesDelta = stats.linesAdded - stats.linesDeleted;
    return stats;
  } catch (error) {
    console.error(`Failed to get diff stats for commit ${commitHash}:`, error);
    // Fall back to estimation
    return null;
  }
}

module.exports = {
  parseGitCommitStats,
  getCommitDiffStats
};
