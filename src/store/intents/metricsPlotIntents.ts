import { AppDispatch, RootState } from '../index';
import { 
  setMetricsPlotCalendarData, 
  setMetricsPlotChartDimensions 
} from '../slices/uiSlice';
import { getCachedCalendarData, type CalendarData } from '../../services/calendarService';
import { getCountryForTimezone, DEFAULT_TIMEZONE } from '../../config/timezones';
import { Logger } from '../../utils/logging/Logger';
import { metricsConfig } from '../../config';

/**
 * Fetches calendar data for the metrics plot based on date range and timezone
 */
export const fetchMetricsPlotCalendarData =
  (startDate: Date | undefined, endDate: Date | undefined) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    const timezone = state.preferences.timezone || DEFAULT_TIMEZONE;
    const showHolidays = state.preferences.showHolidays ?? true;
    const showBridgeDays = state.preferences.showBridgeDays ?? true;

    if (!startDate || !endDate || (!showHolidays && !showBridgeDays)) {
      dispatch(setMetricsPlotCalendarData(null));
      return;
    }

    try {
      const country = getCountryForTimezone(timezone);
      if (!country) {
        dispatch(setMetricsPlotCalendarData(null));
        return;
      }

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

      dispatch(setMetricsPlotCalendarData(combinedCalendarData));
    } catch (error) {
      Logger.warn(Logger.Categories.DATA, 'Failed to fetch calendar data:', error);
      dispatch(setMetricsPlotCalendarData(null));
    }
  };

/**
 * Updates chart dimensions based on container size and data
 */
export const updateMetricsPlotChartDimensions =
  (containerWidth: number, dataLength: number) =>
  (dispatch: AppDispatch) => {
    const { chart } = metricsConfig;
    const MIN_DAY_WIDTH = 16; // Minimum width per day for readability
    
    const availableWidth = containerWidth - 16; // Minimal padding
    const marginWidth = chart.margin.left + chart.margin.right;
    const innerAvailableWidth = availableWidth - marginWidth;
    
    // Calculate actual day width if we show all days
    const actualDayWidth = innerAvailableWidth / dataLength;
    
    // Check if we need scrolling
    const needsScrolling = actualDayWidth < MIN_DAY_WIDTH;
    
    if (needsScrolling) {
      // Calculate how many days we can show with minimum width
      const visibleDays = Math.floor(innerAvailableWidth / MIN_DAY_WIDTH);
      const totalWidth = dataLength * MIN_DAY_WIDTH + marginWidth;
      
      dispatch(setMetricsPlotChartDimensions({
        width: totalWidth,
        height: chart.height,
        visibleWidth: availableWidth,
        needsScrolling: true,
        dayWidth: MIN_DAY_WIDTH,
        visibleDays: visibleDays
      }));
    } else {
      // Show all days without scrolling
      dispatch(setMetricsPlotChartDimensions({
        width: availableWidth,
        height: chart.height,
        visibleWidth: availableWidth,
        needsScrolling: false,
        dayWidth: actualDayWidth,
        visibleDays: dataLength
      }));
    }
  };