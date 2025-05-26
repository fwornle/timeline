import type { GitTimelineEvent } from '../types/TimelineEvent';

// Generate mock git history data with realistic periods of activity and inactivity
export const mockGitHistory = (): GitTimelineEvent[] => {
  const mockCommits: GitTimelineEvent[] = [];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3); // Start 3 months ago

  // Create realistic commit patterns with periods of activity and inactivity
  const activityPeriods = [
    { start: 0, end: 5, frequency: 1 },    // Initial burst: daily commits for 5 days
    { start: 12, end: 15, frequency: 2 },  // Gap, then some work: every 2 days for 3 commits
    { start: 25, end: 35, frequency: 1 },  // Another gap, then active period: daily for 10 days
    { start: 45, end: 50, frequency: 3 },  // Final gap, then some commits: every 3 days
  ];

  let commitIndex = 0;

  activityPeriods.forEach(period => {
    for (let day = period.start; day <= period.end; day += period.frequency) {
      const commitDate = new Date(startDate);
      commitDate.setDate(commitDate.getDate() + day);

      const linesAdded = Math.floor(Math.random() * 200) + 10;
      const linesDeleted = Math.floor(Math.random() * 100) + 5;
      const filesModified = Math.floor(Math.random() * 5) + 1;
      const filesAdded = commitIndex % 4 === 0 ? Math.floor(Math.random() * 3) + 1 : 0;
      const filesDeleted = commitIndex % 7 === 0 ? Math.floor(Math.random() * 2) : 0;

      mockCommits.push({
        id: `git-mock-hash-${commitIndex}`,
        type: 'git',
        timestamp: commitDate,
        title: `Mock commit #${commitIndex}: ${commitIndex % 3 === 0 ? 'Feature' : commitIndex % 3 === 1 ? 'Fix' : 'Refactor'} - ${Math.random().toString(36).substring(7)}`,
        description: `Detailed description for mock commit #${commitIndex}`,
        commitHash: `mock-hash-${commitIndex}`,
        authorName: 'Mock User',
        authorEmail: 'mock@example.com',
        branch: 'main',
        files: [
          {
            path: `src/file${commitIndex % 5}.js`,
            changeType: commitIndex % 3 === 0 ? 'added' : commitIndex % 3 === 1 ? 'modified' : 'deleted'
          },
          {
            path: `docs/doc${commitIndex % 3}.md`,
            changeType: 'added'
          }
        ],
        stats: {
          filesAdded,
          filesModified,
          filesDeleted,
          linesAdded,
          linesDeleted,
          linesDelta: linesAdded - linesDeleted,
          totalFilesChanged: filesAdded + filesModified + filesDeleted
        }
      });

      commitIndex++;
    }
  });

  return mockCommits;
};
