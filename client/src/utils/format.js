/**
 * Formats a date using the Intl.DateTimeFormat API.
 *
 * @param value - The date to format (string or Date object).
 * @param locale - The locale to use for formatting (default: navigator.language).
 * @returns The formatted date string.
 */
export function formatDate(value, locale = navigator.language) {
  try {
    const d = typeof value === 'string' ? new Date(value) : value;
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch (_) {
    return String(value);
  }
}

/**
 * Formats a number using the Intl.NumberFormat API.
 *
 * @param value - The number to format.
 * @param locale - The locale to use for formatting (default: navigator.language).
 * @param options - Additional options for Intl.NumberFormat.
 * @returns The formatted number string.
 */
export function formatNumber(value, locale = navigator.language, options = {}) {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch (_) {
    return String(value);
  }
}
