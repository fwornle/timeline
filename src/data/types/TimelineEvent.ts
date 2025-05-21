export interface BaseTimelineEvent {
  id: string;
  timestamp: Date;
  type: 'git' | 'spec';
  title: string;
  description?: string;
}

export interface GitTimelineEvent extends BaseTimelineEvent {
  type: 'git';
  commitHash: string;
  authorName: string;
  authorEmail: string;
  branch: string;
  files: Array<{
    path: string;
    changeType: 'added' | 'modified' | 'deleted';
  }>;
  stats?: {
    // Support both naming conventions
    filesAdded?: number;
    filesCreated?: number; // Alternative name used in server
    filesModified: number;
    filesDeleted: number;
    linesAdded: number;
    linesDeleted: number;
    linesDelta: number;
    totalFilesChanged?: number; // Additional field from server
  };
}

export interface SpecTimelineEvent extends BaseTimelineEvent {
  type: 'spec';
  specId: string;
  version: string;
  changes: Array<{
    field: string;
    oldValue: string | number | boolean | null;
    newValue: string | number | boolean | null;
  }>;
  stats?: {
    promptCount: number;
    filesCreated: number;
    filesModified: number;
    linesAdded: number;
    linesDeleted: number;
    linesDelta: number;
    toolInvocations: number;
  };
}

export type TimelineEvent = GitTimelineEvent | SpecTimelineEvent;

export interface TimelinePeriod {
  start: Date;
  end: Date;
  events: TimelineEvent[];
}
