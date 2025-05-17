import type { SpecTimelineEvent } from '../types/TimelineEvent';

// Generate mock spec history data
export const mockSpecHistory = (): SpecTimelineEvent[] => {
  const mockSpecs: SpecTimelineEvent[] = [];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3); // Start 3 months ago

  const specTypes = ['API', 'UI', 'Database', 'Architecture', 'Security'];
  const statuses = ['draft', 'review', 'approved', 'implemented', 'deprecated'];

  for (let i = 0; i < 15; i++) {
    const specDate = new Date(startDate);
    specDate.setDate(specDate.getDate() + (i * 5)); // One spec every 5 days

    const specType = specTypes[i % specTypes.length];
    const status = statuses[Math.min(i % statuses.length, 4)];
    const version = `0.${Math.floor(i / 3) + 1}.${i % 3}`;

    mockSpecs.push({
      id: `spec-mock-spec-${i}-${version}`,
      type: 'spec',
      timestamp: specDate,
      title: `${specType} Specification ${i + 1}`,
      description: `This is a mock ${specType.toLowerCase()} specification for testing purposes`,
      specId: `mock-spec-${i}`,
      version: version,
      changes: [
        {
          field: 'status',
          oldValue: 'draft',
          newValue: status
        },
        {
          field: 'tags',
          oldValue: null,
          newValue: `${specType.toLowerCase()}, ${status}, v${version}`
        }
      ]
    });
  }

  return mockSpecs;
};
