/**
 * Horizontal metrics plot component showing code evolution over time
 */
import React, { useMemo, useRef, useEffect, useState } from 'react';
import type { TimelineEvent } from '../../data/types/TimelineEvent';
import {
  calculateCodeMetrics,
  findClosestMetricsPoint,
  positionToTimestamp,
} from '../../utils/metrics/codeMetrics';
import { metricsConfig } from '../../config';
import { getCachedCalendarData, type CalendarData } from '../../services/calendarService';
import { getCountryForTimezone, DEFAULT_TIMEZONE } from '../../config/timezones';
import { useAppSelector } from '../../store';

interface HorizontalMetricsPlotProps {
  events: TimelineEvent[];
  currentPosition?: number;
  timelineLength?: number;
  startDate?: Date;
  endDate?: Date;
  onPositionChange?: (position: number) => void;
  height?: number;
  className?: string;
}

export const HorizontalMetricsPlot: React.FC<HorizontalMetricsPlotProps> = ({
  events,
  currentPosition = 0,
  timelineLength = 100,
  startDate,
  endDate,
  onPositionChange,
  height: _height = 150, // eslint-disable-line @typescript-eslint/no-unused-vars
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleMetrics, setVisibleMetrics] = useState<string[]>(['linesOfCode', 'totalFiles', 'commitCount']);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<number>(-1);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);

  // Get timezone and calendar preferences
  const timezone = useAppSelector(state => state.preferences.timezone) || DEFAULT_TIMEZONE;
  const showHolidays = useAppSelector(state => state.preferences.showHolidays) ?? true;
  const showBridgeDays = useAppSelector(state => state.preferences.showBridgeDays) ?? false; // Default to false to reduce clutter

  // Fetch calendar data when timezone, preferences, or date range changes
  useEffect(() => {
    if (!startDate || !endDate || (!showHolidays && !showBridgeDays)) {
      setCalendarData(null);
      return;
    }

    const fetchCalendarData = async () => {
      try {
        const country = getCountryForTimezone(timezone);
        if (!country) return;

        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();

        // Fetch calendar data for all years in the range
        const calendarPromises = [];
        for (let year = startYear; year <= endYear; year++) {
          calendarPromises.push(getCachedCalendarData(year, country, timezone));
        }

        const calendarResults = await Promise.all(calendarPromises);

        // Combine all calendar data
        const combinedCalendarData: CalendarData = {
          holidays: calendarResults.flatMap(data => data.holidays),
          bridgeDays: calendarResults.flatMap(data => data.bridgeDays),
          year: startYear,
          country: country
        };

        setCalendarData(combinedCalendarData);
      } catch (error) {
        console.warn('Failed to fetch calendar data:', error);
        setCalendarData(null);
      }
    };

    fetchCalendarData();
  }, [timezone, startDate, endDate, showHolidays, showBridgeDays]);

  // Calculate metrics from events
  const metricsPoints = useMemo(() => {
    return calculateCodeMetrics(events);
  }, [events]);

  // Find current position marker index
  const currentMarkerIndex = useMemo(() => {
    if (!startDate || !endDate || metricsPoints.length === 0) return -1;

    const currentTimestamp = positionToTimestamp(currentPosition, timelineLength, startDate, endDate, events.length);
    const closestPoint = findClosestMetricsPoint(metricsPoints, currentTimestamp);

    if (!closestPoint) return -1;

    return metricsPoints.findIndex(point => point === closestPoint);
  }, [currentPosition, timelineLength, startDate, endDate, metricsPoints, events.length]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (metricsPoints.length === 0) return null;

    const maxLOC = Math.max(...metricsPoints.map(p => p.cumulativeLinesOfCode || 0), 1);
    const maxFiles = Math.max(...metricsPoints.map(p => p.totalFiles || 0), 1);
    const maxCommits = Math.max(...metricsPoints.map(p => p.commitCount || 0), 1);

    return metricsPoints.map((point, index) => {
      const loc = point.cumulativeLinesOfCode || 0;
      const files = point.totalFiles || 0;
      const commits = point.commitCount || 0;
      
      return {
        index,
        timestamp: point.timestamp,
        loc,
        files,
        commits,
        locNormalized: (loc / maxLOC) * 100,
        filesNormalized: (files / maxFiles) * 100,
        commitsNormalized: (commits / maxCommits) * 100,
        linesAdded: point.linesAdded,
        linesDeleted: point.linesDeleted,
        filesModified: point.filesModified,
        isWeekend: point.timestamp.getDay() === 0 || point.timestamp.getDay() === 6, // Sunday = 0, Saturday = 6
      };
    });
  }, [metricsPoints]);

  // SVG chart dimensions - use full available width
  const { chart } = metricsConfig;
  const [chartDimensions, setChartDimensions] = useState({
    width: chart.width,
    height: chart.height
  });

  // Update chart dimensions based on container size
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const availableWidth = containerWidth - 32; // Account for padding
        setChartDimensions({
          width: Math.max(availableWidth, 400), // Minimum width
          height: chart.height
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [chart.height]);

  const innerWidth = chartDimensions.width - chart.margin.left - chart.margin.right;
  const innerHeight = chartDimensions.height - chart.margin.top - chart.margin.bottom;

  // Create path strings for SVG lines
  interface ChartDataPoint {
    index: number;
    timestamp: Date;
    loc: number;
    files: number;
    commits: number;
    locNormalized: number;
    filesNormalized: number;
    commitsNormalized: number;
    linesAdded: number;
    linesDeleted: number;
    filesModified: number;
    isWeekend: boolean;
  }

  const createPath = (data: ChartDataPoint[], metric: 'locNormalized' | 'filesNormalized' | 'commitsNormalized') => {
    if (!data || data.length === 0) return '';
    if (data.length === 1) {
      // Single point - draw a small horizontal line
      const x = innerWidth / 2;
      const y = innerHeight - (data[0][metric] / 100) * innerHeight;
      if (isNaN(x) || isNaN(y)) return '';
      return `M ${x - 5},${y} L ${x + 5},${y}`;
    }

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * innerWidth;
      const y = innerHeight - ((d[metric] || 0) / 100) * innerHeight;
      
      // Validate coordinates
      if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
        return null;
      }
      
      return `${x},${y}`;
    }).filter(point => point !== null);

    if (points.length === 0) return '';
    return `M ${points.join(' L ')}`;
  };

  // Handle point click
  const handlePointClick = (index: number) => {
    if (onPositionChange && startDate && endDate && metricsPoints[index]) {
      const clickedPoint = metricsPoints[index];
      const timeRange = endDate.getTime() - startDate.getTime();
      const normalizedTime = (clickedPoint.timestamp.getTime() - startDate.getTime()) / timeRange;
      const position = (normalizedTime - 0.5) * timelineLength;
      onPositionChange(position);
    }
  };

  // Toggle metric visibility
  const toggleMetric = (metricKey: string) => {
    setVisibleMetrics(prev =>
      prev.includes(metricKey)
        ? prev.filter(m => m !== metricKey)
        : [...prev, metricKey]
    );
  };

  // Mouse hover detection for slide-down behavior
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const isNearTop = e.clientY < 120; // Near top bar
      const isOverContainer = e.clientX >= rect.left && e.clientX <= rect.right &&
                             e.clientY >= rect.top && e.clientY <= rect.bottom;

      // Expand if near top OR hovering over container
      const shouldExpand = isNearTop || isOverContainer;

      if (shouldExpand !== isExpanded) {
        setIsExpanded(shouldExpand);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isExpanded]);

  const actualHeight = isExpanded ? metricsConfig.layout.expandedHeight : metricsConfig.layout.compactHeight;

  return (
    <div
      ref={containerRef}
      className={`${className}`}
      style={{
        height: `${actualHeight}px`,
        backgroundColor: 'rgba(15, 23, 42, 0.98)',
        backdropFilter: 'blur(12px)',
        borderBottom: isExpanded ? '1px solid rgba(71, 85, 105, 0.4)' : 'none',
        transform: isExpanded ? 'translateY(0)' : `translateY(-${actualHeight - metricsConfig.layout.compactHeight}px)`,
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 1000,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Header - title when collapsed, stats when expanded */}
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{
          height: `${metricsConfig.layout.headerHeight}px`,
          borderBottom: isExpanded ? '1px solid rgba(71, 85, 105, 0.2)' : 'none',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          {!isExpanded ? (
            <span style={{
              color: metricsConfig.typography.header.fill,
              fontSize: `${metricsConfig.typography.header.fontSize}px`,
              fontWeight: metricsConfig.typography.header.fontWeight
            }}>
              Code Evolution
            </span>
          ) : (
            currentMarkerIndex >= 0 && metricsPoints[currentMarkerIndex] && (
              <span style={{
                color: metricsConfig.typography.header.fill,
                fontSize: `${metricsConfig.typography.header.fontSize}px`,
                fontWeight: metricsConfig.typography.header.fontWeight
              }}>
                {metricsPoints[currentMarkerIndex].cumulativeLinesOfCode.toLocaleString()} LOC • {metricsPoints[currentMarkerIndex].totalFiles} Files • {metricsPoints[currentMarkerIndex].commitCount} Commits
              </span>
            )
          )}
        </div>
      </div>

      {/* Expanded content */}
      <div
        className="relative"
        style={{
          height: `${actualHeight - metricsConfig.layout.headerHeight}px`,
          opacity: isExpanded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }}
      >
        {/* SVG Chart */}
        <div className="w-full h-full rounded overflow-hidden bg-slate-900/20 border border-slate-700/30 relative">
          {chartData && chartData.length > 0 ? (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                width={chartDimensions.width}
                height={chartDimensions.height}
                viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
                className="max-w-full max-h-full"
                style={{ background: 'transparent' }}
              >
                {/* Grid lines */}
                <g transform={`translate(${chart.margin.left}, ${chart.margin.top})`}>
                  {/* Horizontal grid lines */}
                  {[0, 25, 50, 75, 100].map(percent => (
                    <line
                      key={`h-grid-${percent}`}
                      x1={0}
                      y1={innerHeight - (percent / 100) * innerHeight}
                      x2={innerWidth}
                      y2={innerHeight - (percent / 100) * innerHeight}
                      stroke={metricsConfig.grid.horizontal}
                      strokeWidth={metricsConfig.grid.strokeWidth}
                    />
                  ))}

                  {/* Vertical grid lines */}
                  {chartData.filter((_, i) => i % Math.max(1, Math.floor(chartData.length / 5)) === 0).map((_, i) => {
                    const index = i * Math.max(1, Math.floor(chartData.length / 5));
                    const x = (index / (chartData.length - 1)) * innerWidth;
                    return (
                      <line
                        key={`v-grid-${i}`}
                        x1={x}
                        y1={0}
                        x2={x}
                        y2={innerHeight}
                        stroke={metricsConfig.grid.vertical}
                        strokeWidth={metricsConfig.grid.strokeWidth}
                      />
                    );
                  })}

                  {/* Weekend markers - faint blue bars spanning Friday evening to Monday morning */}
                  {(() => {
                    const weekendBars: React.ReactElement[] = [];
                    let weekendStart = -1;

                    for (let i = 0; i < chartData.length; i++) {
                      const d = chartData[i];
                      const isCurrentWeekend = d.isWeekend;
                      const isNextWeekend = i < chartData.length - 1 ? chartData[i + 1].isWeekend : false;

                      // Start of weekend period
                      if (isCurrentWeekend && weekendStart === -1) {
                        weekendStart = i;
                      }

                      // End of weekend period (or end of data)
                      if (weekendStart !== -1 && (!isNextWeekend || i === chartData.length - 1)) {
                        // Calculate positions with half-day offsets
                        const dayWidth = innerWidth / (chartData.length - 1);

                        // Start bar half a day before the first weekend day (Friday evening)
                        const startX = (weekendStart / (chartData.length - 1)) * innerWidth - (dayWidth * 0.5);

                        // End bar half a day after the last weekend day (Monday morning)
                        const endX = (i / (chartData.length - 1)) * innerWidth + (dayWidth * 0.5);

                        const width = Math.max(endX - startX, dayWidth); // Ensure minimum weekend width

                        weekendBars.push(
                          <rect
                            key={`weekend-bar-${weekendStart}-${i}`}
                            x={Math.max(0, startX)} // Don't go negative
                            y={0}
                            width={Math.min(width, innerWidth - Math.max(0, startX))} // Don't exceed chart width
                            height={innerHeight}
                            fill="rgba(59, 130, 246, 0.08)" // Faint blue background
                            stroke="rgba(59, 130, 246, 0.2)" // Slightly more visible border
                            strokeWidth={0.5}
                          />
                        );

                        weekendStart = -1;
                      }
                    }

                    return weekendBars;
                  })()}

                  {/* Holiday markers - faint red bars for public holidays */}
                  {calendarData && showHolidays && (() => {
                    const holidayBars: React.ReactElement[] = [];

                    calendarData.holidays.forEach((holiday, index) => {
                      // Parse date as UTC to avoid timezone issues
                      const [year, month, day] = holiday.date.split('-').map(Number);
                      const holidayDate = new Date(Date.UTC(year, month - 1, day));

                      // Find the closest chart data point for this holiday
                      let closestIndex = -1;
                      let minDiff = Infinity;

                      chartData.forEach((d, i) => {
                        // Compare dates at midnight in UTC for both
                        const chartDateUTC = new Date(Date.UTC(
                          d.timestamp.getFullYear(),
                          d.timestamp.getMonth(),
                          d.timestamp.getDate()
                        ));
                        const diff = Math.abs(chartDateUTC.getTime() - holidayDate.getTime());
                        if (diff < minDiff) {
                          minDiff = diff;
                          closestIndex = i;
                        }
                      });

                      if (closestIndex !== -1 && minDiff < 24 * 60 * 60 * 1000) { // Within 1 day
                        const dayWidth = innerWidth / (chartData.length - 1);
                        const startX = (closestIndex / (chartData.length - 1)) * innerWidth - (dayWidth * 0.5);
                        const width = dayWidth;

                        holidayBars.push(
                          <g key={`holiday-bar-${index}`}>
                            <rect
                              x={Math.max(0, startX)}
                              y={0}
                              width={Math.min(width, innerWidth - Math.max(0, startX))}
                              height={innerHeight}
                              fill="rgba(239, 68, 68, 0.12)" // Faint red background
                              stroke="rgba(239, 68, 68, 0.3)" // Slightly more visible red border
                              strokeWidth={0.5}
                            />
                            <title>{holiday.name}</title>
                          </g>
                        );
                      }
                    });

                    return holidayBars;
                  })()}

                  {/* Bridge day markers - faint red diagonally striped bars */}
                  {calendarData && showBridgeDays && (() => {
                    const bridgeBars: React.ReactElement[] = [];

                    calendarData.bridgeDays.forEach((bridgeDay, index) => {
                      // Parse date as UTC to avoid timezone issues
                      const [year, month, day] = bridgeDay.date.split('-').map(Number);
                      const bridgeDate = new Date(Date.UTC(year, month - 1, day));

                      // Find the closest chart data point for this bridge day
                      let closestIndex = -1;
                      let minDiff = Infinity;

                      chartData.forEach((d, i) => {
                        // Compare dates at midnight in UTC for both
                        const chartDateUTC = new Date(Date.UTC(
                          d.timestamp.getFullYear(),
                          d.timestamp.getMonth(),
                          d.timestamp.getDate()
                        ));
                        const diff = Math.abs(chartDateUTC.getTime() - bridgeDate.getTime());
                        if (diff < minDiff) {
                          minDiff = diff;
                          closestIndex = i;
                        }
                      });

                      if (closestIndex !== -1 && minDiff < 24 * 60 * 60 * 1000) { // Within 1 day
                        const dayWidth = innerWidth / (chartData.length - 1);
                        const startX = (closestIndex / (chartData.length - 1)) * innerWidth - (dayWidth * 0.5);
                        const width = dayWidth;
                        const patternId = `bridge-pattern-${index}`;

                        bridgeBars.push(
                          <g key={`bridge-bar-${index}`}>
                            <defs>
                              <pattern
                                id={patternId}
                                patternUnits="userSpaceOnUse"
                                width="8"
                                height="8"
                                patternTransform="rotate(45)"
                              >
                                <rect width="8" height="8" fill="rgba(239, 68, 68, 0.08)" />
                                <rect width="4" height="8" fill="rgba(239, 68, 68, 0.15)" />
                              </pattern>
                            </defs>
                            <rect
                              x={Math.max(0, startX)}
                              y={0}
                              width={Math.min(width, innerWidth - Math.max(0, startX))}
                              height={innerHeight}
                              fill={`url(#${patternId})`}
                              stroke="rgba(239, 68, 68, 0.25)"
                              strokeWidth={0.5}
                            />
                            <title>{bridgeDay.name}</title>
                          </g>
                        );
                      }
                    });

                    return bridgeBars;
                  })()}

                  {/* Metric lines */}
                  {visibleMetrics.includes('linesOfCode') && (
                    <path
                      d={createPath(chartData, 'locNormalized')}
                      fill="none"
                      stroke={metricsConfig.colors.linesOfCode.line}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {visibleMetrics.includes('totalFiles') && (
                    <path
                      d={createPath(chartData, 'filesNormalized')}
                      fill="none"
                      stroke={metricsConfig.colors.totalFiles.line}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {visibleMetrics.includes('commitCount') && (
                    <path
                      d={createPath(chartData, 'commitsNormalized')}
                      fill="none"
                      stroke={metricsConfig.colors.commitCount.line}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Data points */}
                  {chartData.map((d, i) => {
                    // Handle single point case
                    const x = chartData.length === 1 
                      ? innerWidth / 2 
                      : (i / (chartData.length - 1)) * innerWidth;
                    const isCurrentPoint = i === currentMarkerIndex;
                    const isHovered = i === hoveredPoint;
                    const radius = isCurrentPoint
                      ? metricsConfig.points.radius.current
                      : isHovered
                        ? metricsConfig.points.radius.hovered
                        : metricsConfig.points.radius.normal;

                    return (
                      <g key={`point-${i}`}>
                        {/* Render points for each visible metric */}
                        {['linesOfCode', 'totalFiles', 'commitCount'].map((metric) => {
                          if (!visibleMetrics.includes(metric)) return null;

                          const metricConfig = metricsConfig.colors[metric as keyof typeof metricsConfig.colors];
                          const yPos = metric === 'linesOfCode' ? d.locNormalized
                                     : metric === 'totalFiles' ? d.filesNormalized
                                     : d.commitsNormalized;

                          // Skip rendering if coordinates are invalid
                          const cy = innerHeight - ((yPos || 0) / 100) * innerHeight;
                          if (isNaN(x) || isNaN(cy) || !isFinite(x) || !isFinite(cy)) {
                            return null;
                          }

                          return (
                            <circle
                              key={metric}
                              cx={x}
                              cy={cy}
                              r={radius}
                              fill={isCurrentPoint ? metricsConfig.colors.currentPosition.fill : metricConfig.line}
                              stroke={isCurrentPoint ? metricsConfig.colors.currentPosition.stroke : metricConfig.lineHover}
                              strokeWidth={isCurrentPoint ? metricsConfig.points.strokeWidth.current : metricsConfig.points.strokeWidth.normal}
                              className="cursor-pointer transition-all duration-200"
                              onClick={() => handlePointClick(i)}
                              onMouseEnter={() => setHoveredPoint(i)}
                              onMouseLeave={() => setHoveredPoint(-1)}
                            />
                          );
                        })}

                        {/* Tooltip on hover */}
                        {isHovered && (() => {
                          const maxNormalized = Math.max(d.locNormalized, d.filesNormalized, d.commitsNormalized);
                          const pointY = innerHeight - (maxNormalized / 100) * innerHeight;
                          const tooltipHeight = metricsConfig.tooltip.height;
                          const tooltipMargin = 10;

                          // Smart positioning: show above if below 50%, show below if above 50%
                          const showBelow = maxNormalized > 50;
                          const tooltipY = showBelow
                            ? pointY + tooltipMargin
                            : pointY - tooltipHeight - tooltipMargin;

                          // Ensure tooltip doesn't go off the left or right edges
                          const tooltipX = Math.max(
                            metricsConfig.tooltip.width / 2,
                            Math.min(
                              x,
                              innerWidth - metricsConfig.tooltip.width / 2
                            )
                          );

                          return (
                            <g>
                              <rect
                                x={tooltipX - metricsConfig.tooltip.width / 2}
                                y={tooltipY}
                                width={metricsConfig.tooltip.width}
                                height={metricsConfig.tooltip.height}
                                fill={metricsConfig.tooltip.background}
                                stroke={metricsConfig.tooltip.border}
                                strokeWidth={1}
                                rx={metricsConfig.tooltip.borderRadius}
                              />
                              <text
                                x={tooltipX}
                                y={tooltipY + 20}
                                textAnchor="middle"
                                fill={metricsConfig.typography.tooltip.title.fill}
                                fontSize={metricsConfig.typography.tooltip.title.fontSize}
                                fontWeight={metricsConfig.typography.tooltip.title.fontWeight}
                                fontFamily={metricsConfig.typography.axis.fontFamily}
                              >
                                {d.timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </text>
                              <text
                                x={tooltipX}
                                y={tooltipY + 35}
                                textAnchor="middle"
                                fill={metricsConfig.typography.tooltip.content.fill}
                                fontSize={metricsConfig.typography.tooltip.content.fontSize}
                                fontFamily={metricsConfig.typography.axis.fontFamily}
                              >
                                {d.loc.toLocaleString()} LOC, {d.files} files
                              </text>
                              <text
                                x={tooltipX}
                                y={tooltipY + 45}
                                textAnchor="middle"
                                fill={metricsConfig.typography.tooltip.content.fill}
                                fontSize={metricsConfig.typography.tooltip.content.fontSize}
                                fontFamily={metricsConfig.typography.axis.fontFamily}
                              >
                                +{d.linesAdded} -{d.linesDeleted} lines
                              </text>
                            </g>
                          );
                        })()}
                      </g>
                    );
                  })}

                  {/* Y-axis labels */}
                  {[0, 25, 50, 75, 100].map(percent => (
                    <text
                      key={`y-label-${percent}`}
                      x={-10}
                      y={innerHeight - (percent / 100) * innerHeight + 4}
                      textAnchor="end"
                      fill={metricsConfig.typography.axis.fill}
                      fontSize={metricsConfig.typography.axis.fontSize}
                      fontFamily={metricsConfig.typography.axis.fontFamily}
                      fontWeight={metricsConfig.typography.axis.fontWeight}
                    >
                      {percent}%
                    </text>
                  ))}

                  {/* X-axis labels */}
                  {chartData.filter((_, i) => i % Math.max(1, Math.floor(chartData.length / 4)) === 0).map((d, i) => {
                    const index = i * Math.max(1, Math.floor(chartData.length / 4));
                    const x = (index / (chartData.length - 1)) * innerWidth;
                    return (
                      <text
                        key={`x-label-${i}`}
                        x={x}
                        y={innerHeight + 18}
                        textAnchor="middle"
                        fill={metricsConfig.typography.axis.fill}
                        fontSize={metricsConfig.typography.axis.fontSize}
                        fontFamily={metricsConfig.typography.axis.fontFamily}
                        fontWeight={metricsConfig.typography.axis.fontWeight}
                      >
                        {d.timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </text>
                    );
                  })}
                </g>
              </svg>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              <div className="text-center">
                <div className="text-gray-400 mb-2 text-xl">📊</div>
                <div style={{ color: metricsConfig.typography.header.fill }} className="font-medium">No metrics data available</div>
                <div className="text-xs text-gray-500 mt-1">Waiting for git events...</div>
              </div>
            </div>
          )}
        </div>

        {/* Filter buttons positioned in bottom right of expanded content area */}
        <div className="absolute bottom-2 right-2 flex gap-1 z-10">
          <button
            onClick={() => toggleMetric('linesOfCode')}
            className="px-2 py-0 text-xs rounded transition-all duration-200 font-medium text-white"
            style={{
              backgroundColor: visibleMetrics.includes('linesOfCode')
                ? metricsConfig.colors.linesOfCode.line
                : 'rgba(71, 85, 105, 0.8)',
              boxShadow: visibleMetrics.includes('linesOfCode') ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
            }}
          >
            LOC
          </button>
          <button
            onClick={() => toggleMetric('totalFiles')}
            className="px-2 py-0 text-xs rounded transition-all duration-200 font-medium text-white"
            style={{
              backgroundColor: visibleMetrics.includes('totalFiles')
                ? metricsConfig.colors.totalFiles.line
                : 'rgba(71, 85, 105, 0.8)',
              boxShadow: visibleMetrics.includes('totalFiles') ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
            }}
          >
            Files
          </button>
          <button
            onClick={() => toggleMetric('commitCount')}
            className="px-2 py-0 text-xs rounded transition-all duration-200 font-medium text-white"
            style={{
              backgroundColor: visibleMetrics.includes('commitCount')
                ? metricsConfig.colors.commitCount.line
                : 'rgba(71, 85, 105, 0.8)',
              boxShadow: visibleMetrics.includes('commitCount') ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
            }}
          >
            Commits
          </button>
        </div>
      </div>
    </div>
  );
};
