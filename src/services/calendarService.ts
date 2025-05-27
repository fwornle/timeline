/**
 * Calendar service for fetching public holidays and detecting bridge days
 */

export interface PublicHoliday {
  date: string;        // YYYY-MM-DD format
  name: string;        // Holiday name
  type: 'public' | 'bridge';
  country: string;     // ISO country code
}

export interface CalendarData {
  holidays: PublicHoliday[];
  bridgeDays: PublicHoliday[];
  year: number;
  country: string;
}

/**
 * Fetches calendar data (holidays and bridge days) for a given year and country
 */
export async function fetchCalendarData(
  year: number, 
  country: string, 
  timezone: string
): Promise<CalendarData> {
  try {
    const response = await fetch(
      `/api/v1/calendar?year=${year}&country=${country}&timezone=${encodeURIComponent(timezone)}`
    );
    
    if (!response.ok) {
      throw new Error(`Calendar API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to fetch calendar data');
    }
    
    return data.data;
  } catch (error) {
    console.warn('Failed to fetch calendar data, using empty calendar:', error);
    
    // Return empty calendar data as fallback
    return {
      holidays: [],
      bridgeDays: [],
      year,
      country
    };
  }
}

/**
 * Checks if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Checks if a date is a public holiday
 */
export function isPublicHoliday(date: Date, holidays: PublicHoliday[]): boolean {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return holidays.some(holiday => holiday.date === dateStr && holiday.type === 'public');
}

/**
 * Checks if a date is a bridge day
 */
export function isBridgeDay(date: Date, bridgeDays: PublicHoliday[]): boolean {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return bridgeDays.some(bridge => bridge.date === dateStr && bridge.type === 'bridge');
}

/**
 * Gets the holiday/bridge day info for a specific date
 */
export function getHolidayInfo(date: Date, calendarData: CalendarData): PublicHoliday | null {
  const dateStr = date.toISOString().split('T')[0];
  
  // Check holidays first
  const holiday = calendarData.holidays.find(h => h.date === dateStr);
  if (holiday) return holiday;
  
  // Check bridge days
  const bridgeDay = calendarData.bridgeDays.find(b => b.date === dateStr);
  if (bridgeDay) return bridgeDay;
  
  return null;
}

/**
 * Cache for calendar data to avoid repeated API calls
 */
class CalendarCache {
  private cache = new Map<string, CalendarData>();
  private readonly maxAge = 24 * 60 * 60 * 1000; // 24 hours
  private timestamps = new Map<string, number>();

  private getCacheKey(year: number, country: string): string {
    return `${year}-${country}`;
  }

  get(year: number, country: string): CalendarData | null {
    const key = this.getCacheKey(year, country);
    const timestamp = this.timestamps.get(key);
    
    if (!timestamp || Date.now() - timestamp > this.maxAge) {
      // Cache expired
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }
    
    return this.cache.get(key) || null;
  }

  set(year: number, country: string, data: CalendarData): void {
    const key = this.getCacheKey(year, country);
    this.cache.set(key, data);
    this.timestamps.set(key, Date.now());
  }

  clear(): void {
    this.cache.clear();
    this.timestamps.clear();
  }
}

// Global cache instance
const calendarCache = new CalendarCache();

/**
 * Fetches calendar data with caching
 */
export async function getCachedCalendarData(
  year: number, 
  country: string, 
  timezone: string
): Promise<CalendarData> {
  // Try cache first
  const cached = calendarCache.get(year, country);
  if (cached) {
    return cached;
  }
  
  // Fetch fresh data
  const data = await fetchCalendarData(year, country, timezone);
  
  // Cache the result
  calendarCache.set(year, country, data);
  
  return data;
}

/**
 * Clears the calendar cache (useful for testing or manual refresh)
 */
export function clearCalendarCache(): void {
  calendarCache.clear();
}
