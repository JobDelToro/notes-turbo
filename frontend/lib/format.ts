/**
 * Small, dependency-free formatting helpers.
 */

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Format an ISO timestamp as the editor's "Last Edited" stamp:
 * `Month D, YYYY at h:mma` — e.g. "July 6, 2026 at 3:07pm".
 */
export function formatLastEdited(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const month = MONTHS[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const meridiem = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${month} ${day}, ${year} at ${hours}:${minutes}${meridiem}`;
}

/** Short date shown in the note card meta row — e.g. "Jul 6, 2026". */
export function formatCardDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const month = MONTHS[date.getMonth()].slice(0, 3);
  return `${month} ${date.getDate()}, ${date.getFullYear()}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Human "time ago" for the note card, e.g. "just now", "4m ago", "2h ago",
 * "3d ago". Beyond a week it falls back to the absolute short date so old notes
 * still read cleanly. Clamps future timestamps (clock skew) to "just now".
 */
export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return formatCardDate(iso);
}

/** Word count for the editor's info line. Empty / whitespace-only → 0. */
export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Rounded reading time in minutes (≥1 once there's any text), ~200 wpm. */
export function readingMinutes(words: number): number {
  return words > 0 ? Math.max(1, Math.ceil(words / 200)) : 0;
}

/**
 * A friendly first name derived from an email local-part, for the dashboard
 * greeting (we don't collect a display name). "job.31195@x.com" → "Job".
 * Falls back to "there" so the greeting always reads naturally.
 */
export function displayName(email: string | undefined | null): string {
  const local = (email ?? '').split('@')[0] ?? '';
  const first = local.split(/[._\-+0-9]/).find(Boolean) ?? '';
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : 'there';
}

/** Time-of-day greeting from a local hour (0–23). */
export function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** True when an ISO timestamp falls on the same calendar day as `now`. */
export function isSameDay(iso: string, now: Date): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
