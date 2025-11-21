import { describe, it, expect } from 'vitest';
import {
  parseCronExpression,
  matchesCron,
  getNextCronDate,
  isValidCronExpression,
} from '../src/utils/cron.js';

describe('Cron Expression Parser', () => {
  it('should parse a simple cron expression', () => {
    const cron = parseCronExpression('0 * * * *');
    expect(cron.minutes).toEqual([0]);
    expect(cron.hours).toEqual([...Array(24).keys()]);
  });

  it('should parse cron with specific values', () => {
    const cron = parseCronExpression('30 9 * * 1-5');
    expect(cron.minutes).toEqual([30]);
    expect(cron.hours).toEqual([9]);
    expect(cron.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
  });

  it('should validate correct cron expressions', () => {
    expect(isValidCronExpression('0 0 * * *')).toBe(true);
    expect(isValidCronExpression('*/5 * * * *')).toBe(true);
    expect(isValidCronExpression('0 9-17 * * 1-5')).toBe(true);
  });

  it('should reject invalid cron expressions', () => {
    expect(isValidCronExpression('invalid')).toBe(false);
    expect(isValidCronExpression('* * *')).toBe(false);
    expect(isValidCronExpression('60 * * * *')).toBe(false);
  });

  it('should match cron to a date', () => {
    const cron = parseCronExpression('0 12 * * *');
    const matchingDate = new Date('2024-01-15T12:00:00');
    const nonMatchingDate = new Date('2024-01-15T13:00:00');

    expect(matchesCron(matchingDate, cron)).toBe(true);
    expect(matchesCron(nonMatchingDate, cron)).toBe(false);
  });

  it('should get next cron date', () => {
    const cron = parseCronExpression('0 12 * * *');
    const fromDate = new Date('2024-01-15T10:00:00');
    const nextDate = getNextCronDate(cron, fromDate);

    expect(nextDate.getHours()).toBe(12);
    expect(nextDate.getMinutes()).toBe(0);
    expect(nextDate >= fromDate).toBe(true);
  });
});
