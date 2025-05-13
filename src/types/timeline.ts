export interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  category?: string;
  tags?: string[];
  mediaUrl?: string;
  mediaType?: 'image' | 'link';
  position: number;
}

export interface Timeline {
  id: string;
  title: string;
  description?: string;
  events: Event[];
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  viewMode: 'horizontal' | 'vertical';
  ownerId: string;
}

export type TimelineCreateInput = Omit<Timeline, 'id' | 'createdAt' | 'updatedAt'>;
export type TimelineUpdateInput = Partial<TimelineCreateInput>;

export type EventCreateInput = Omit<Event, 'id'>;
export type EventUpdateInput = Partial<EventCreateInput>;