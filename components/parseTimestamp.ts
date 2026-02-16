/**
 * Parse a timestamp that may be either:
 * - Unix milliseconds string: "1771229700000"
 * - ISO 8601 string: "2026-02-16T15:58:12.992362Z"
 * 
 * Returns a Unix ms number for consistent use in Date constructors and sorting.
 */
export function parseTimestamp(timestamp: string): number {
  if (!timestamp) return 0

  // If it's purely numeric, treat as Unix ms
  if (/^\d+$/.test(timestamp)) {
    return parseInt(timestamp, 10)
  }

  // Otherwise parse as ISO date string
  const parsed = new Date(timestamp).getTime()
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Format a mixed-format timestamp to a locale display string.
 */
export function formatTimestamp(timestamp: string): string {
  const ms = parseTimestamp(timestamp)
  if (ms === 0) return 'N/A'
  return new Date(ms).toLocaleString()
}
