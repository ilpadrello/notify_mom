import { DateTime } from "luxon";

/**
 * Mapping of Italian month names to numeric month (1-12)
 */
const MONTH_MAPPING: Record<string, number> = {
  gennaio: 1,
  febbraio: 2,
  marzo: 3,
  aprile: 4,
  maggio: 5,
  giugno: 6,
  luglio: 7,
  agosto: 8,
  settembre: 9,
  ottobre: 10,
  novembre: 11,
  dicembre: 12,
};

/**
 * Convert Italian month name to numeric month
 * @param monthName Italian month name (e.g., 'Marzo')
 * @returns Numeric month (1-12)
 */
export function italianMonthToNumber(monthName: string): number {
  const normalized = monthName.toLowerCase().trim();
  const month = MONTH_MAPPING[normalized];
  if (month === undefined) {
    throw new Error(`Invalid Italian month name: ${monthName}`);
  }
  return month;
}

/**
 * Generate unique ID from month, day, and time
 * Format: YYYY-MM-DD_HH:MM
 * @param monthName Italian month name
 * @param day Day of month
 * @param time Time in hh:mm format
 * @returns Unique string ID
 */
export function generateUniqueId(
  monthName: string,
  day: string | number,
  time: string,
): string {
  const month = italianMonthToNumber(monthName);
  const dayNum = parseInt(day.toString(), 10);

  // Use current year
  const year = new Date().getFullYear();

  const date = DateTime.fromObject({
    year,
    month,
    day: dayNum,
  });

  if (!date.isValid) {
    throw new Error(`Invalid date: ${year}-${month}-${dayNum}`);
  }

  return `${date.toFormat("yyyy-MM-dd")}_${time}`;
}

/**
 * Parse time string to validate format hh:mm
 * @param time Time string in hh:mm format
 * @returns Object with hours and minutes
 */
export function parseTime(time: string): { hours: number; minutes: number } {
  const parts = time.split(":");
  if (parts.length !== 2) {
    throw new Error(`Invalid time format: ${time}. Expected hh:mm`);
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (
    isNaN(hours) ||
    isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Invalid time values: ${time}`);
  }

  return { hours, minutes };
}

/**
 * Normalize string for case-insensitive comparison
 * @param str String to normalize
 * @returns Lowercase trimmed string
 */
export function normalizeString(str: string): string {
  return str.toLowerCase().trim();
}
