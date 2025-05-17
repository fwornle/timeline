import React, { useState } from 'react';
import { useTimeline } from '../context/TimelineContext';
import type { TimelineCreateInput } from '../types/timeline';

interface TimelineFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const TimelineForm: React.FC<TimelineFormProps> = ({ onSuccess, onCancel }) => {
  const { createTimeline } = useTimeline();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const newTimeline: TimelineCreateInput = {
        title: formData.get('title') as string,
        description: formData.get('description') as string || undefined,
        viewMode: 'horizontal',
        events: [],
        isPublic: false,
        ownerId: 'temp-user-id',
      };
      await createTimeline(newTimeline);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create timeline');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-2 bg-red-50 text-red-600 rounded">{error}</div>}
        <div>
          <input
            type="text"
            name="title"
            required
            placeholder="Timeline Title"
            className="w-full p-2 border rounded"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <textarea
            name="description"
            placeholder="Description (optional)"
            className="w-full p-2 border rounded"
            rows={3}
            disabled={isSubmitting}
          />
        </div>
        <div className="flex justify-end gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Timeline'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TimelineForm;