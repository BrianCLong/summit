const DEFAULT_LOCALE = 'en-US';

const normalizeDate = (value) => {
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Format a timestamp in UTC with optional date/seconds components.
 * @param {Date | number | string} value
 * @param {{ locale?: string; timeZone?: string; includeDate?: boolean; includeSeconds?: boolean }} [options]
 */
export const formatAbsoluteTime = (
  value,
  { locale = DEFAULT_LOCALE, timeZone = 'UTC', includeDate = true, includeSeconds = true } = {},
) => {
  const date = normalizeDate(value);
  if (!date) return 'Invalid date';

  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone,
    year: includeDate ? 'numeric' : undefined,
    month: includeDate ? '2-digit' : undefined,
    day: includeDate ? '2-digit' : undefined,
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: false,
  });

  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  const datePart = includeDate ? `${parts.year}-${parts.month}-${parts.day}` : '';
  const timePart = includeSeconds
    ? `${parts.hour}:${parts.minute}:${parts.second}`
    : `${parts.hour}:${parts.minute}`;

  return `${datePart ? `${datePart} ` : ''}${timePart} ${timeZone}`.trim();
};

/**
 * Format relative time against a base instant.
 * @param {Date | number | string} value
 * @param {{ base?: Date | number | string; locale?: string }} [options]
 */
export const formatRelativeTime = (
  value,
  { base = Date.now(), locale = DEFAULT_LOCALE } = {},
) => {
  const date = normalizeDate(value);
  const baseDate = normalizeDate(base) || new Date(base);
  if (!date || !baseDate) return 'Invalid date';

  const diffMs = date.getTime() - baseDate.getTime();
  const absMs = Math.abs(diffMs);
  const divisions = [
    { unit: 'day', ms: 86_400_000 },
    { unit: 'hour', ms: 3_600_000 },
    { unit: 'minute', ms: 60_000 },
    { unit: 'second', ms: 1_000 },
  ];

  const division = divisions.find(({ ms }) => absMs >= ms) || divisions[divisions.length - 1];
  const valueRounded = Math.round(diffMs / division.ms);
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
    valueRounded,
    division.unit,
  );
};

/**
 * Format numeric values with grouping and optional precision.
 * @param {number | string | null | undefined} value
 * @param {Intl.NumberFormatOptions} [options]
 */
export const formatNumber = (value, options = {}) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    maximumFractionDigits: 1,
    ...options,
  }).format(value);
};

/**
 * Format currency strings with ISO currency codes.
 * @param {number | string | null | undefined} value
 * @param {{ currency?: string; minimumFractionDigits?: number; maximumFractionDigits?: number }} [options]
 */
export const formatCurrency = (
  value,
  { currency = 'USD', minimumFractionDigits = 2, maximumFractionDigits = 2 } = {},
) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
};

/**
 * Format usage percentages for display and progress widths.
 * @param {number | string} numerator
 * @param {number | string} denominator
 * @param {{ minimumFractionDigits?: number; maximumFractionDigits?: number }} [options]
 */
export const formatPercent = (
  numerator,
  denominator,
  { minimumFractionDigits = 0, maximumFractionDigits = 0 } = {},
) => {
  const safeDenominator = Number(denominator);
  const safeNumerator = Number(numerator);
  if (Number.isNaN(safeDenominator) || safeDenominator <= 0 || Number.isNaN(safeNumerator)) {
    return '0%';
  }
  const value = (safeNumerator / safeDenominator) * 100;
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'percent',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value / 100);
};

if (typeof window !== 'undefined') {
  window.SymphonyFormatting = {
    formatAbsoluteTime,
    formatRelativeTime,
    formatNumber,
    formatCurrency,
    formatPercent,
  };
}

export default {
  formatAbsoluteTime,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  formatPercent,
};
