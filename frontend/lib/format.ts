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
