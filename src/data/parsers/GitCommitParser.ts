/**
 * Parser for git commit data to extract statistics
 */
import { GitTimelineEvent } from '../types/TimelineEvent';

interface GitCommitStats {
  filesAdded: number;
  filesModified: number;
  filesDeleted: number;
  linesAdded: number;
  linesDeleted: number;
  linesDelta: number;
}

/**
 * Parse git commit data to extract statistics
 * @param commit The git commit data
 * @returns Statistics about the commit
 */
export function parseGitCommitStats(commit: GitTimelineEvent): GitCommitStats {
  // Initialize stats
  const stats: GitCommitStats = {
    filesAdded: 0,
    filesModified: 0,
    filesDeleted: 0,
    linesAdded: 0,
    linesDeleted: 0,
    linesDelta: 0
  };

  // Count files by change type
  if (commit.files && Array.isArray(commit.files)) {
    commit.files.forEach(file => {
      switch (file.changeType) {
        case 'added':
          stats.filesAdded++;
          break;
        case 'modified':
          stats.filesModified++;
          break;
        case 'deleted':
          stats.filesDeleted++;
          break;
      }
    });
  }

  // For line counts, we would need to fetch the actual diff content
  // This would typically be done by a separate API call or git command
  // For now, we'll leave these as 0 and implement them later if needed

  // Calculate delta (placeholder for now)
  stats.linesDelta = stats.linesAdded - stats.linesDeleted;

  return stats;
}

/**
 * Enhance a git commit with statistics
 * @param commit The git commit to enhance
 * @returns The enhanced commit with statistics
 */
export function enhanceGitCommitWithStats(commit: GitTimelineEvent): GitTimelineEvent {
  const stats = parseGitCommitStats(commit);
  return {
    ...commit,
    stats
  };
}
