/**
 * Timezone configuration for public holiday detection
 * Organized by regions with common timezone/country mappings
 */

export interface TimezoneInfo {
  value: string;           // IANA timezone identifier
  label: string;           // Display name
  country: string;         // ISO country code for holiday API
  region: string;          // Geographic region for grouping
}

export const timezones: TimezoneInfo[] = [
  // Europe
  { value: 'Europe/Berlin', label: 'Germany (Munich/Berlin)', country: 'DE', region: 'Europe' },
  { value: 'Europe/Vienna', label: 'Austria (Vienna)', country: 'AT', region: 'Europe' },
  { value: 'Europe/Zurich', label: 'Switzerland (Zurich)', country: 'CH', region: 'Europe' },
  { value: 'Europe/Paris', label: 'France (Paris)', country: 'FR', region: 'Europe' },
  { value: 'Europe/London', label: 'United Kingdom (London)', country: 'GB', region: 'Europe' },
  { value: 'Europe/Rome', label: 'Italy (Rome)', country: 'IT', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'Spain (Madrid)', country: 'ES', region: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'Netherlands (Amsterdam)', country: 'NL', region: 'Europe' },
  { value: 'Europe/Stockholm', label: 'Sweden (Stockholm)', country: 'SE', region: 'Europe' },
  { value: 'Europe/Oslo', label: 'Norway (Oslo)', country: 'NO', region: 'Europe' },
  { value: 'Europe/Copenhagen', label: 'Denmark (Copenhagen)', country: 'DK', region: 'Europe' },
  { value: 'Europe/Helsinki', label: 'Finland (Helsinki)', country: 'FI', region: 'Europe' },
  { value: 'Europe/Warsaw', label: 'Poland (Warsaw)', country: 'PL', region: 'Europe' },
  { value: 'Europe/Prague', label: 'Czech Republic (Prague)', country: 'CZ', region: 'Europe' },
  { value: 'Europe/Budapest', label: 'Hungary (Budapest)', country: 'HU', region: 'Europe' },

  // North America
  { value: 'America/New_York', label: 'US Eastern (New York)', country: 'US', region: 'North America' },
  { value: 'America/Chicago', label: 'US Central (Chicago)', country: 'US', region: 'North America' },
  { value: 'America/Denver', label: 'US Mountain (Denver)', country: 'US', region: 'North America' },
  { value: 'America/Los_Angeles', label: 'US Pacific (Los Angeles)', country: 'US', region: 'North America' },
  { value: 'America/Toronto', label: 'Canada Eastern (Toronto)', country: 'CA', region: 'North America' },
  { value: 'America/Vancouver', label: 'Canada Pacific (Vancouver)', country: 'CA', region: 'North America' },
  { value: 'America/Mexico_City', label: 'Mexico (Mexico City)', country: 'MX', region: 'North America' },

  // Asia Pacific
  { value: 'Asia/Tokyo', label: 'Japan (Tokyo)', country: 'JP', region: 'Asia Pacific' },
  { value: 'Asia/Shanghai', label: 'China (Shanghai)', country: 'CN', region: 'Asia Pacific' },
  { value: 'Asia/Seoul', label: 'South Korea (Seoul)', country: 'KR', region: 'Asia Pacific' },
  { value: 'Asia/Singapore', label: 'Singapore', country: 'SG', region: 'Asia Pacific' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong', country: 'HK', region: 'Asia Pacific' },
  { value: 'Asia/Kolkata', label: 'India (Mumbai/Delhi)', country: 'IN', region: 'Asia Pacific' },
  { value: 'Australia/Sydney', label: 'Australia Eastern (Sydney)', country: 'AU', region: 'Asia Pacific' },
  { value: 'Australia/Melbourne', label: 'Australia Eastern (Melbourne)', country: 'AU', region: 'Asia Pacific' },
  { value: 'Australia/Perth', label: 'Australia Western (Perth)', country: 'AU', region: 'Asia Pacific' },
  { value: 'Pacific/Auckland', label: 'New Zealand (Auckland)', country: 'NZ', region: 'Asia Pacific' },

  // South America
  { value: 'America/Sao_Paulo', label: 'Brazil (São Paulo)', country: 'BR', region: 'South America' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (Buenos Aires)', country: 'AR', region: 'South America' },
  { value: 'America/Santiago', label: 'Chile (Santiago)', country: 'CL', region: 'South America' },
  { value: 'America/Bogota', label: 'Colombia (Bogotá)', country: 'CO', region: 'South America' },

  // Africa & Middle East
  { value: 'Africa/Cairo', label: 'Egypt (Cairo)', country: 'EG', region: 'Africa & Middle East' },
  { value: 'Africa/Johannesburg', label: 'South Africa (Johannesburg)', country: 'ZA', region: 'Africa & Middle East' },
  { value: 'Asia/Dubai', label: 'UAE (Dubai)', country: 'AE', region: 'Africa & Middle East' },
  { value: 'Asia/Riyadh', label: 'Saudi Arabia (Riyadh)', country: 'SA', region: 'Africa & Middle East' },
  { value: 'Asia/Tel_Aviv', label: 'Israel (Tel Aviv)', country: 'IL', region: 'Africa & Middle East' },
];

// Default timezone (Munich/Germany as specified)
export const DEFAULT_TIMEZONE = 'Europe/Berlin';

// Group timezones by region for better UX
export const timezonesByRegion = timezones.reduce((acc, tz) => {
  if (!acc[tz.region]) {
    acc[tz.region] = [];
  }
  acc[tz.region].push(tz);
  return acc;
}, {} as Record<string, TimezoneInfo[]>);

// Helper function to find timezone info by value
export function getTimezoneInfo(timezoneValue: string): TimezoneInfo | undefined {
  return timezones.find(tz => tz.value === timezoneValue);
}

// Helper function to get country code for a timezone
export function getCountryForTimezone(timezoneValue: string): string | undefined {
  const info = getTimezoneInfo(timezoneValue);
  return info?.country;
}
