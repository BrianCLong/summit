export function formatDate(value, locale = navigator.language) {
  try {
    const d = typeof value === 'string' ? new Date(value) : value;
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  } catch (_) {
    return String(value);
  }
}

export function formatNumber(value, locale = navigator.language, options = {}) {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch (_) {
    return String(value);
  }
}

