import {
  formatAbsoluteTime,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from '../../ui/utils/formatting.js';

describe('formatting utilities', () => {
  it('formats absolute times in UTC with optional date and seconds', () => {
    const date = new Date('2024-01-02T03:04:05Z');

    expect(formatAbsoluteTime(date)).toBe('2024-01-02 03:04:05 UTC');
    expect(formatAbsoluteTime(date, { includeDate: false, includeSeconds: false })).toBe(
      '03:04 UTC',
    );
  });

  it('provides relative time strings', () => {
    const base = new Date('2024-01-02T03:04:35Z');
    expect(formatRelativeTime('2024-01-02T03:04:05Z', { base })).toBe('30 seconds ago');
    expect(formatRelativeTime('2024-01-02T03:09:35Z', { base })).toBe('in 5 minutes');
  });

  it('formats numeric values consistently', () => {
    expect(formatNumber(12345.678)).toBe('12,345.7');
    expect(formatCurrency(42)).toBe('$42.00');
    expect(formatPercent(3, 12)).toBe('25%');
  });
});
