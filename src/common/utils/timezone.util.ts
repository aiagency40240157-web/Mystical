/**
 * Timezone helpers for the business location.
 *
 * The office is in Orange County, California, so all business hours, breaks and
 * client-facing times are expressed in US Pacific Time (America/Los_Angeles).
 * Instants are still stored in UTC; these helpers convert between the stored
 * UTC instants and Pacific wall-clock time, handling PST/PDT (DST) automatically
 * via the native Intl API — no external dependency required.
 */

export const BUSINESS_TZ = 'America/Los_Angeles';

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TZ,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

type WallClock = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function getParts(date: Date): WallClock {
  const map: Record<string, number> = {};
  for (const part of partsFormatter.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = parseInt(part.value, 10);
  }
  if (map.hour === 24) map.hour = 0; // some runtimes report midnight as 24
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour,
    minute: map.minute,
    second: map.second,
  };
}

/** UTC offset (ms) of Pacific time at the given instant. Negative for Los Angeles. */
function tzOffsetMs(date: Date): number {
  const p = getParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

/** Wall-clock minutes since midnight in Pacific time for the given instant. */
export function pacificMinutesSinceMidnight(date: Date): number {
  const p = getParts(date);
  return p.hour * 60 + p.minute;
}

/** Pacific calendar date as 'YYYY-MM-DD' for the given instant. */
export function pacificDateString(date: Date): string {
  const p = getParts(date);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Add (or subtract) whole days to a 'YYYY-MM-DD' string, returning a new date string. */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d));
  next.setUTCDate(next.getUTCDate() + days);
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Build the UTC instant matching a Pacific wall-clock date + minutes-since-midnight.
 * Refines once so it stays correct across DST boundaries.
 */
export function pacificWallClockToUtc(dateStr: string, minutes: number): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const hour = Math.floor(minutes / 60);
  const min = minutes % 60;
  const guess = Date.UTC(y, m - 1, d, hour, min, 0);
  let offset = tzOffsetMs(new Date(guess));
  let utc = guess - offset;
  offset = tzOffsetMs(new Date(utc));
  utc = guess - offset;
  return new Date(utc);
}

/** UTC instants bounding the Pacific calendar day that contains dateStr. */
export function pacificDayBounds(dateStr: string): { start: Date; end: Date } {
  const start = pacificWallClockToUtc(dateStr, 0);
  const nextDayStr = addDaysToDateString(dateStr, 1);
  const end = new Date(pacificWallClockToUtc(nextDayStr, 0).getTime() - 1);
  return { start, end };
}

/** Human-readable Pacific time, e.g. "May 21, 2026, 03:00 PM PDT". */
export function formatPacific(date: Date, locale: 'en-US' | 'es-MX' = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(date);
}
