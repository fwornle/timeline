import type { GitTimelineEvent } from '../types/TimelineEvent';

// Generate mock git history data
export const mockGitHistory = (): GitTimelineEvent[] => {
  const mockCommits: GitTimelineEvent[] = [];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3); // Start 3 months ago

  for (let i = 0; i < 20; i++) {
    const commitDate = new Date(startDate);
    commitDate.setDate(commitDate.getDate() + (i * 3)); // One commit every 3 days

    mockCommits.push({
      id: `git-mock-hash-${i}`,
      type: 'git',
      timestamp: commitDate,
      title: `Mock commit #${i}: ${i % 3 === 0 ? 'Feature' : i % 3 === 1 ? 'Fix' : 'Refactor'} - ${Math.random().toString(36).substring(7)}`,
      description: `Detailed description for mock commit #${i}`,
      commitHash: `mock-hash-${i}`,
      authorName: 'Mock User',
      authorEmail: 'mock@example.com',
      branch: 'main',
      files: [
        { 
          path: `src/file${i % 5}.js`, 
          changeType: i % 3 === 0 ? 'added' : i % 3 === 1 ? 'modified' : 'deleted' 
        },
        { 
          path: `docs/doc${i % 3}.md`, 
          changeType: 'added' 
        }
      ]
    });
  }

  return mockCommits;
};
