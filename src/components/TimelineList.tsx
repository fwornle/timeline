import React from 'react';
import { useTimeline } from '../context/TimelineContext';

const TimelineList: React.FC = () => {
  const { timelines, loading, error } = useTimeline();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        {error}
      </div>
    );
  }

  if (timelines.length === 0) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold text-gray-600">No timelines yet</h2>
        <p className="mt-2 text-gray-500">Create your first timeline to get started</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {timelines.map((timeline) => (
        <div
          key={timeline.id}
          className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold">{timeline.title}</h3>
          {timeline.description && (
            <p className="mt-2 text-gray-600">{timeline.description}</p>
          )}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span>{timeline.events.length} events</span>
            <span>
              {new Date(timeline.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TimelineList;