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
import { useAppSelector, useAppDispatch } from '../../store';
import { 
  setMetricsPlotExpanded, 
  setMetricsPlotHoveredPoint, 
  toggleMetricsPlotMetric 
} from '../../store/slices/uiSlice';
import { Logger } from '../../utils/logging/Logger';

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
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  
  // Get state from Redux
  const visibleMetrics = useAppSelector(state => state.ui.metricsPlotVisibleMetrics);
  const isExpanded = useAppSelector(state => state.ui.metricsPlotExpanded);
  const hoveredPoint = useAppSelector(state => state.ui.metricsPlotHoveredPoint);
  
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

        // Debug logging
        Logger.info(Logger.Categories.DATA, '🎯 CALENDAR DATA CHECK:', {
          holidays: combinedCalendarData.holidays.length,
          bridgeDays: combinedCalendarData.bridgeDays.length,
          holidayDates: combinedCalendarData.holidays.map(h => ({
            date: h.date,
            name: h.name,
            dayOfWeek: new Date(h.date + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short' })
          })),
          bridgeDayDates: combinedCalendarData.bridgeDays.map(b => ({
            date: b.date,
            dayOfWeek: new Date(b.date + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short' })
          }))
        });

        setCalendarData(combinedCalendarData);
      } catch (error) {
        Logger.warn(Logger.Categories.DATA, 'Failed to fetch calendar data:', error);
        setCalendarData(null);
      }
    };

    fetchCalendarData();
  }, [timezone, startDate, endDate, showHolidays, showBridgeDays]);

  // Calculate metrics from events
  const metricsPoints = useMemo(() => {
    const points = calculateCodeMetrics(events);
    Logger.info(Logger.Categories.DATA, '📈 METRICS POINTS CALCULATED:', {
      totalPoints: points.length,
      firstPoint: points.length > 0 ? points[0].timestamp.toISOString() : null,
      lastPoint: points.length > 0 ? points[points.length - 1].timestamp.toISOString() : null,
      sampleDates: points.slice(0, 10).map(p => p.timestamp.toLocaleDateString())
    });
    return points;
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

    const data = metricsPoints.map((point, index) => {
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

    return data;
  }, [metricsPoints]);

  // SVG chart dimensions - use full available width
  const { chart } = metricsConfig;
  const [chartDimensions, setChartDimensions] = useState({
    width: chart.width,
    height: chart.height,
    visibleWidth: chart.width,
    needsScrolling: false,
    dayWidth: 0,
    visibleDays: 0
  });

  // Constants for scrolling behavior
  const MIN_DAY_WIDTH = 16; // Minimum width per day for readability
  const SCROLL_EDGE_THRESHOLD = 0.25; // Scroll when marker is 25% from edge

  // Update chart dimensions based on container size
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current && chartData && chartData.length > 0) {
        const containerWidth = containerRef.current.offsetWidth;
        const availableWidth = containerWidth - 16; // Minimal padding
        const marginWidth = chart.margin.left + chart.margin.right;
        const innerAvailableWidth = availableWidth - marginWidth;
        
        // Calculate actual day width if we show all days
        const actualDayWidth = innerAvailableWidth / chartData.length;
        
        // Check if we need scrolling
        const needsScrolling = actualDayWidth < MIN_DAY_WIDTH;
        
        if (needsScrolling) {
          // Calculate how many days we can show with minimum width
          const visibleDays = Math.floor(innerAvailableWidth / MIN_DAY_WIDTH);
          const totalWidth = chartData.length * MIN_DAY_WIDTH + marginWidth;
          
          setChartDimensions({
            width: totalWidth,
            height: chart.height,
            visibleWidth: availableWidth,
            needsScrolling: true,
            dayWidth: MIN_DAY_WIDTH,
            visibleDays: visibleDays
          });
        } else {
          // Show all days without scrolling
          setChartDimensions({
            width: availableWidth,
            height: chart.height,
            visibleWidth: availableWidth,
            needsScrolling: false,
            dayWidth: actualDayWidth,
            visibleDays: chartData.length
          });
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [chart.height, chart.margin, chartData]);

  // Debug logging after dimensions are calculated
  useEffect(() => {
    if (chartData && chartData.length > 0 && chartDimensions.width > 0) {
      Logger.info(Logger.Categories.DATA, '📊 METRICS PLOT DEBUG:', {
        totalPoints: chartData.length,
        showingWeekdayLabels: chartData.length <= 90,
        firstDate: chartData[0].timestamp.toISOString(),
        lastDate: chartData[chartData.length - 1].timestamp.toISOString(),
        chartDimensions: {
          width: chartDimensions.width,
          visibleWidth: chartDimensions.visibleWidth,
          needsScrolling: chartDimensions.needsScrolling,
          dayWidth: chartDimensions.dayWidth,
          visibleDays: chartDimensions.visibleDays
        },
        containerWidth: containerRef.current?.offsetWidth || 0,
        calculatedDayWidth: chartDimensions.width > 0 ? (chartDimensions.width - chart.margin.left - chart.margin.right) / Math.max(chartData.length - 1, 1) : 0,
        firstTwoWeeks: chartData.slice(0, 14).map(d => ({
          date: d.timestamp.toLocaleDateString(),
          day: d.timestamp.toLocaleDateString('en-US', { weekday: 'short' }),
          isWeekend: d.isWeekend
        })),
        missingDays: (() => {
          const missing = [];
          for (let i = 1; i < Math.min(chartData.length, 14); i++) {
            const prevDate = chartData[i-1].timestamp;
            const currDate = chartData[i].timestamp;
            const dayDiff = (currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000);
            if (dayDiff > 1.5) {
              missing.push({
                after: prevDate.toLocaleDateString(),
                before: currDate.toLocaleDateString(),
                gapDays: Math.round(dayDiff)
              });
            }
          }
          return missing;
        })()
      });
    }
  }, [chartData, chartDimensions, chart.margin]);

  // Handle initial scroll position and auto-scrolling
  useEffect(() => {
    if (chartDimensions.needsScrolling && chartData && currentMarkerIndex >= 0 && svgContainerRef.current) {
      const markerX = (currentMarkerIndex / (chartData.length - 1)) * (chartDimensions.width - chart.margin.left - chart.margin.right);
      const containerWidth = chartDimensions.visibleWidth;
      const scrollContainer = svgContainerRef.current;
      
      // Calculate visible range
      const currentScroll = scrollContainer.scrollLeft;
      const visibleStart = currentScroll;
      const visibleEnd = currentScroll + containerWidth;
      
      // Check if marker is near edges (25% from either side)
      const edgeThreshold = containerWidth * SCROLL_EDGE_THRESHOLD;
      const markerAbsoluteX = markerX + chart.margin.left;
      
      if (markerAbsoluteX < visibleStart + edgeThreshold) {
        // Marker is near left edge, scroll left
        const newScroll = Math.max(0, markerAbsoluteX - edgeThreshold);
        scrollContainer.scrollTo({ left: newScroll, behavior: 'smooth' });
      } else if (markerAbsoluteX > visibleEnd - edgeThreshold) {
        // Marker is near right edge, scroll right
        const newScroll = Math.min(
          scrollContainer.scrollWidth - containerWidth,
          markerAbsoluteX - containerWidth + edgeThreshold
        );
        scrollContainer.scrollTo({ left: newScroll, behavior: 'smooth' });
      }
    }
  }, [currentMarkerIndex, chartData, chartDimensions, chart.margin, SCROLL_EDGE_THRESHOLD]);

  // Set initial scroll position based on marker position
  useEffect(() => {
    if (chartDimensions.needsScrolling && chartData && svgContainerRef.current) {
      const markerRelativePosition = currentPosition / timelineLength + 0.5; // Convert to 0-1 range
      const markerIndex = Math.floor(markerRelativePosition * chartData.length);
      const markerX = (markerIndex / chartData.length) * chartDimensions.width;
      
      // Try to center the marker in view initially, but ensure we start from the beginning if possible
      const containerWidth = chartDimensions.visibleWidth;
      let initialScroll = markerX - containerWidth / 2;
      
      // If the marker is in the first half of visible area, start from beginning
      if (initialScroll < 0) {
        initialScroll = 0;
      }
      
      // Ensure we don't scroll past the end
      const maxScroll = chartDimensions.width - containerWidth;
      if (initialScroll > maxScroll) {
        initialScroll = maxScroll;
      }
      
      svgContainerRef.current.scrollLeft = initialScroll;
    }
  }, [chartDimensions.needsScrolling]); // Only run when scrolling state changes

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
      const x = chartDimensions.needsScrolling ? 
        i * chartDimensions.dayWidth :
        (i / (data.length - 1)) * innerWidth;
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
    dispatch(toggleMetricsPlotMetric(metricKey));
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
        dispatch(setMetricsPlotExpanded(shouldExpand));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isExpanded, dispatch]);

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
        <div 
          ref={svgContainerRef}
          className="w-full h-full rounded overflow-x-auto overflow-y-hidden bg-slate-900/20 border border-slate-700/30 relative"
          style={{ 
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(71, 85, 105, 0.5) transparent'
          }}
        >
          {chartData && chartData.length > 0 ? (
            <div className="h-full flex items-center" style={{ 
              minWidth: chartDimensions.needsScrolling ? `${chartDimensions.width}px` : 'auto',
              width: chartDimensions.needsScrolling ? `${chartDimensions.width}px` : '100%'
            }}>
              <svg
                width={chartDimensions.width}
                height={chartDimensions.height}
                viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
                style={{ background: 'transparent', display: 'block' }}
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
                    const x = chartDimensions.needsScrolling ? 
                      index * chartDimensions.dayWidth :
                      (index / (chartData.length - 1)) * innerWidth;
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
                        const dayWidth = chartDimensions.needsScrolling ? 
                          chartDimensions.dayWidth :
                          innerWidth / (chartData.length - 1);

                        // Start bar half a day before the first weekend day (Friday evening)
                        const startX = chartDimensions.needsScrolling ?
                          weekendStart * chartDimensions.dayWidth - (dayWidth * 0.5) :
                          (weekendStart / (chartData.length - 1)) * innerWidth - (dayWidth * 0.5);

                        // End bar half a day after the last weekend day (Monday morning)
                        const endX = chartDimensions.needsScrolling ?
                          i * chartDimensions.dayWidth + (dayWidth * 0.5) :
                          (i / (chartData.length - 1)) * innerWidth + (dayWidth * 0.5);

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
                        const dayWidth = chartDimensions.needsScrolling ? 
                          chartDimensions.dayWidth :
                          innerWidth / (chartData.length - 1);
                        const startX = chartDimensions.needsScrolling ?
                          closestIndex * chartDimensions.dayWidth - (dayWidth * 0.5) :
                          (closestIndex / (chartData.length - 1)) * innerWidth - (dayWidth * 0.5);
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
                        const dayWidth = chartDimensions.needsScrolling ? 
                          chartDimensions.dayWidth :
                          innerWidth / (chartData.length - 1);
                        const startX = chartDimensions.needsScrolling ?
                          closestIndex * chartDimensions.dayWidth - (dayWidth * 0.5) :
                          (closestIndex / (chartData.length - 1)) * innerWidth - (dayWidth * 0.5);
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
                      : chartDimensions.needsScrolling ?
                        i * chartDimensions.dayWidth :
                        (i / (chartData.length - 1)) * innerWidth;
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

                          // Type guard to ensure metricConfig has the required properties
                          const hasLineProps = metricConfig && 'line' in metricConfig && 'lineHover' in metricConfig;
                          const fillColor = isCurrentPoint ? metricsConfig.colors.currentPosition.fill : (hasLineProps ? metricConfig.line : '#3b82f6');
                          const strokeColor = isCurrentPoint ? metricsConfig.colors.currentPosition.stroke : (hasLineProps ? metricConfig.lineHover : '#2563eb');

                          return (
                            <circle
                              key={metric}
                              cx={x}
                              cy={cy}
                              r={radius}
                              fill={fillColor}
                              stroke={strokeColor}
                              strokeWidth={isCurrentPoint ? metricsConfig.points.strokeWidth.current : metricsConfig.points.strokeWidth.normal}
                              className="cursor-pointer transition-all duration-200"
                              onClick={() => handlePointClick(i)}
                              onMouseEnter={() => dispatch(setMetricsPlotHoveredPoint(i))}
                              onMouseLeave={() => dispatch(setMetricsPlotHoveredPoint(-1))}
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

                  {/* X-axis labels - Show dates for sparse data, weekdays for dense data */}
                  {chartData.length <= 90 ? (
                    // For 90 days or less, show weekday labels for each day
                    chartData.map((d, i) => {
                      const x = chartData.length === 1 
                        ? innerWidth / 2 
                        : chartDimensions.needsScrolling ?
                          i * chartDimensions.dayWidth :
                          (i / (chartData.length - 1)) * innerWidth;
                      const weekday = d.timestamp.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
                      const isWeekend = d.isWeekend;
                      
                      return (
                        <g key={`x-label-${i}`}>
                          <text
                            x={x}
                            y={innerHeight + 14}
                            textAnchor="middle"
                            fill={isWeekend ? 'rgba(59, 130, 246, 0.8)' : metricsConfig.typography.axis.fill}
                            fontSize={10}
                            fontFamily={metricsConfig.typography.axis.fontFamily}
                            fontWeight={isWeekend ? '600' : metricsConfig.typography.axis.fontWeight}
                          >
                            {weekday}
                          </text>
                          {/* Show month/date below weekday for every 7th day or first/last */}
                          {(i === 0 || i === chartData.length - 1 || i % 7 === 0) && (
                            <text
                              x={x}
                              y={innerHeight + 26}
                              textAnchor="middle"
                              fill={metricsConfig.typography.axis.fill}
                              fontSize={8}
                              fontFamily={metricsConfig.typography.axis.fontFamily}
                              fontWeight={metricsConfig.typography.axis.fontWeight}
                            >
                              {d.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </text>
                          )}
                        </g>
                      );
                    })
                  ) : (
                    // For longer periods, show dates at intervals
                    chartData.filter((_, i) => i % Math.max(1, Math.floor(chartData.length / 4)) === 0).map((d, i) => {
                      const index = i * Math.max(1, Math.floor(chartData.length / 4));
                      const x = chartDimensions.needsScrolling ?
                        index * chartDimensions.dayWidth :
                        (index / (chartData.length - 1)) * innerWidth;
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
                    })
                  )}
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
        <div className="absolute bottom-1 right-1 flex gap-0.5 z-10">
          <button
            onClick={() => toggleMetric('linesOfCode')}
            className="px-1 py-0 rounded transition-all duration-200 font-normal text-white opacity-60 hover:opacity-90"
            style={{
              backgroundColor: visibleMetrics.includes('linesOfCode')
                ? metricsConfig.colors.linesOfCode.line
                : 'rgba(71, 85, 105, 0.5)',
              fontSize: '8px',
              height: '16px'
            }}
          >
            LOC
          </button>
          <button
            onClick={() => toggleMetric('totalFiles')}
            className="px-1 py-0 rounded transition-all duration-200 font-normal text-white opacity-60 hover:opacity-90"
            style={{
              backgroundColor: visibleMetrics.includes('totalFiles')
                ? metricsConfig.colors.totalFiles.line
                : 'rgba(71, 85, 105, 0.5)',
              fontSize: '8px',
              height: '16px'
            }}
          >
            Files
          </button>
          <button
            onClick={() => toggleMetric('commitCount')}
            className="px-1 py-0 rounded transition-all duration-200 font-normal text-white opacity-60 hover:opacity-90"
            style={{
              backgroundColor: visibleMetrics.includes('commitCount')
                ? metricsConfig.colors.commitCount.line
                : 'rgba(71, 85, 105, 0.5)',
              fontSize: '8px',
              height: '16px'
            }}
          >
            Commits
          </button>
        </div>
      </div>
    </div>
  );
};
