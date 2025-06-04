/**
 * Utilities for calculating and processing code metrics from timeline events
 */
import type { TimelineEvent, GitTimelineEvent } from '../../data/types/TimelineEvent';
import { Logger } from '../logging/Logger';
import { positionToDate } from '../timeline/timelineCalculations';

export interface CodeMetricsPoint {
  timestamp: Date;
  cumulativeLinesOfCode: number;
  totalFiles: number;
  commitCount: number;
  linesAdded: number;
  linesDeleted: number;
  filesAdded: number;
  filesModified: number;
  filesDeleted: number;
}

export interface MetricsDataset {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  fill: boolean;
  tension: number;
  pointRadius: number;
  pointHoverRadius: number;
}

/**
 * Calculate cumulative code metrics from timeline events
 */
export function calculateCodeMetrics(events: TimelineEvent[]): CodeMetricsPoint[] {
  // Filter and sort git events by timestamp
  const gitEvents = events
    .filter((event): event is GitTimelineEvent => event.type === 'git')
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  if (gitEvents.length === 0) {
    return [];
  }

  const metricsPoints: CodeMetricsPoint[] = [];
  let cumulativeLinesOfCode = 0;
  let totalFiles = 0;
  let commitCount = 0;

  // Get the time range
  const startTime = gitEvents[0].timestamp;
  const endTime = gitEvents[gitEvents.length - 1].timestamp;
  const totalTimeSpan = endTime.getTime() - startTime.getTime();

  // Create time intervals - ensure daily intervals for proper weekend detection
  // Use daily intervals for short periods to avoid weekend detection issues
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.ceil(totalTimeSpan / dayMs);
  const intervalMs = totalDays <= 30 ? dayMs : Math.max(dayMs, totalTimeSpan / 50); // Daily for short periods, max 50 points for longer periods

  // Debug logging
  Logger.debug(Logger.Categories.DATA, 'calculateCodeMetrics processing', {
    gitEventsCount: gitEvents.length,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    totalTimeSpanDays: totalTimeSpan / (24 * 60 * 60 * 1000),
    intervalDays: intervalMs / (24 * 60 * 60 * 1000),
  });
  const timePoints: Date[] = [];

  if (totalDays <= 30) {
    // For short periods, ensure one point per day for accurate weekend detection
    const startDay = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());
    const endDay = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate());
    
    for (let time = startDay.getTime(); time <= endDay.getTime(); time += dayMs) {
      timePoints.push(new Date(time));
    }
  } else {
    // For longer periods, use the calculated interval
    for (let time = startTime.getTime(); time <= endTime.getTime(); time += intervalMs) {
      timePoints.push(new Date(time));
    }
    
    // Ensure we include the end time
    if (timePoints[timePoints.length - 1].getTime() < endTime.getTime()) {
      timePoints.push(endTime);
    }
  }

  // Process each time point
  let eventIndex = 0;

  timePoints.forEach((timePoint) => {
    // Process all git events up to this time point
    while (eventIndex < gitEvents.length && gitEvents[eventIndex].timestamp <= timePoint) {
      const event = gitEvents[eventIndex];

      // Update cumulative metrics
      commitCount++;

      const stats = event.stats;
      if (stats) {
        // Update lines of code (cumulative)
        const linesDelta = stats.linesDelta || (stats.linesAdded || 0) - (stats.linesDeleted || 0);
        cumulativeLinesOfCode += linesDelta;

        // Update file count (approximate - this is a simplified calculation)
        const filesAdded = stats.filesAdded || stats.filesCreated || 0;
        const filesDeleted = stats.filesDeleted || 0;
        totalFiles += filesAdded - filesDeleted;

        // Ensure totalFiles doesn't go negative
        totalFiles = Math.max(0, totalFiles);
      }

      eventIndex++;
    }

    // Get the most recent event stats for this time point (if any)
    const mostRecentEvent = eventIndex > 0 ? gitEvents[eventIndex - 1] : null;
    const stats = mostRecentEvent?.stats;

    const metricsPoint: CodeMetricsPoint = {
      timestamp: timePoint,
      cumulativeLinesOfCode: Math.max(0, cumulativeLinesOfCode), // Ensure non-negative
      totalFiles,
      commitCount,
      linesAdded: stats?.linesAdded || 0,
      linesDeleted: stats?.linesDeleted || 0,
      filesAdded: stats?.filesAdded || stats?.filesCreated || 0,
      filesModified: stats?.filesModified || 0,
      filesDeleted: stats?.filesDeleted || 0,
    };

    metricsPoints.push(metricsPoint);
  });

  // Debug logging for final results
  Logger.debug(Logger.Categories.DATA, 'Final metrics points calculated', {
    pointsCount: metricsPoints.length,
    samplePoints: metricsPoints.slice(0, 5).map(p => ({
      date: p.timestamp.toISOString().split('T')[0],
      commits: p.commitCount,
      loc: p.cumulativeLinesOfCode,
      files: p.totalFiles
    })),
    finalPoint: metricsPoints.length > 0 ? {
      date: metricsPoints[metricsPoints.length - 1].timestamp.toISOString().split('T')[0],
      commits: metricsPoints[metricsPoints.length - 1].commitCount,
      loc: metricsPoints[metricsPoints.length - 1].cumulativeLinesOfCode,
      files: metricsPoints[metricsPoints.length - 1].totalFiles
    } : null
  });

  return metricsPoints;
}

/**
 * Create Chart.js datasets from metrics points
 */
export function createMetricsDatasets(
  metricsPoints: CodeMetricsPoint[],
  visibleMetrics: string[]
): MetricsDataset[] {
  const datasets: MetricsDataset[] = [];

  // Define metric configurations
  const metricConfigs = {
    linesOfCode: {
      label: 'Lines of Code',
      dataKey: 'cumulativeLinesOfCode' as keyof CodeMetricsPoint,
      borderColor: '#3b82f6', // blue
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    totalFiles: {
      label: 'Total Files',
      dataKey: 'totalFiles' as keyof CodeMetricsPoint,
      borderColor: '#10b981', // green
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    commitCount: {
      label: 'Commits',
      dataKey: 'commitCount' as keyof CodeMetricsPoint,
      borderColor: '#f59e0b', // amber
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
    },
  };

  // Create datasets for visible metrics
  visibleMetrics.forEach((metricKey) => {
    const config = metricConfigs[metricKey as keyof typeof metricConfigs];
    if (config) {
      const data = metricsPoints.map((point) => point[config.dataKey] as number);

      datasets.push({
        label: config.label,
        data,
        borderColor: config.borderColor,
        backgroundColor: config.backgroundColor,
        fill: false,
        tension: 0.1,
        pointRadius: 2,
        pointHoverRadius: 4,
      });
    }
  });

  return datasets;
}

/**
 * Get time labels for Chart.js
 */
export function getTimeLabels(metricsPoints: CodeMetricsPoint[]): string[] {
  return metricsPoints.map((point) =>
    point.timestamp.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    })
  );
}

/**
 * Find the closest metrics point to a given timestamp
 */
export function findClosestMetricsPoint(
  metricsPoints: CodeMetricsPoint[],
  timestamp: Date
): CodeMetricsPoint | null {
  if (metricsPoints.length === 0) return null;

  let closest = metricsPoints[0];
  let minDiff = Math.abs(timestamp.getTime() - closest.timestamp.getTime());

  for (const point of metricsPoints) {
    const diff = Math.abs(timestamp.getTime() - point.timestamp.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = point;
    }
  }

  return closest;
}

/**
 * Convert timeline position to timestamp
 */
export function positionToTimestamp(
  position: number,
  timelineLength: number,
  startDate: Date,
  endDate: Date,
  actualEventCount?: number
): Date {
  // Use centralized calculation for consistency
  // Use actual event count if provided, otherwise estimate from timeline length
  const eventCount = actualEventCount && actualEventCount > 0 ? actualEventCount : Math.max(1, Math.floor(timelineLength / 5));
  
  return positionToDate(
    position,
    startDate.getTime(),
    endDate.getTime(),
    eventCount
  );
}
