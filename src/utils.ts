import { DateTime } from "luxon";
import logger from "./logger.js";

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
 * Mapping of English month names to numeric month (1-12)
 */
const ENGLISH_MONTH_MAPPING: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

/**
 * Convert English month name to numeric month
 * @param monthName English month name (e.g., 'March', 'march', 'MARCH')
 * @returns Numeric month (1-12) or false if invalid
 */
export function englishMonthToNumber(monthName: string): number | false {
  const normalized = monthName.toLowerCase().trim();
  const month = ENGLISH_MONTH_MAPPING[normalized];
  return month !== undefined ? month : false;
}

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
/**
 * Create event timestamp from month name, day, and time
 * @param monthName English month name (e.g., 'March')
 * @param day Day of month (1-31)
 * @param time Time in hh:mm format
 * @returns ISO timestamp string (YYYY-MM-DDTHH:mm:ss.SSSZ) or null if conversion fails
 */
export function createEventTimestamp(
  monthName: string,
  day: string | number,
  time: string,
): string | null {
  try {
    // Convert month name to number
    const monthNum = englishMonthToNumber(monthName);
    if (monthNum === false) {
      logger.warn(`Failed to convert month name: ${monthName}`);
      return null;
    }

    // Parse day as number
    const dayNum = parseInt(day.toString(), 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      logger.warn(`Invalid day: ${day}`);
      return null;
    }

    // Parse time
    const timeData = parseTime(time);

    // Use current year
    const year = new Date().getFullYear();

    // Create date object
    const date = DateTime.fromObject({
      year,
      month: monthNum,
      day: dayNum,
      hour: timeData.hours,
      minute: timeData.minutes,
      second: 0,
      millisecond: 0,
    });

    if (!date.isValid) {
      logger.warn(
        `Invalid date/time combination: ${year}-${monthNum}-${dayNum} ${time}`,
      );
      return null;
    }

    return date.toISO();
  } catch (error) {
    logger.warn(`Error creating event timestamp: ${error}`);
    return null;
  }
}
