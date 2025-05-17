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
}

export type TimelineEvent = GitTimelineEvent | SpecTimelineEvent;

export interface TimelinePeriod {
  start: Date;
  end: Date;
  events: TimelineEvent[];
}