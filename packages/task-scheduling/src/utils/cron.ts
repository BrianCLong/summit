/**
 * Simple cron expression parser and scheduler
 * Replaces node-cron and cron-parser for better portability
 */

export interface CronField {
  values: number[];
  all: boolean;
}

export interface ParsedCron {
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
}

/**
 * Parse a cron expression
 * Format: minute hour dayOfMonth month dayOfWeek
 */
export function parseCronExpression(expression: string): ParsedCron {
  const parts = expression.trim().split(/\s+/);

  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: ${expression}. Expected 5 fields.`);
  }

  return {
    minute: parseField(parts[0], 0, 59),
    hour: parseField(parts[1], 0, 23),
    dayOfMonth: parseField(parts[2], 1, 31),
    month: parseField(parts[3], 1, 12),
    dayOfWeek: parseField(parts[4], 0, 6),
  };
}

function parseField(field: string, min: number, max: number): CronField {
  if (field === '*') {
    return { values: [], all: true };
  }

  const values: Set<number> = new Set();

  // Handle comma-separated values
  const parts = field.split(',');

  for (const part of parts) {
    // Handle step values (e.g., */5)
    if (part.includes('/')) {
      const [range, stepStr] = part.split('/');
      const step = parseInt(stepStr, 10);
      const [start, end] = range === '*' ? [min, max] : parseRange(range, min, max);

      for (let i = start; i <= end; i += step) {
        values.add(i);
      }
    }
    // Handle ranges (e.g., 1-5)
    else if (part.includes('-')) {
      const [start, end] = parseRange(part, min, max);
      for (let i = start; i <= end; i++) {
        values.add(i);
      }
    }
    // Single value
    else {
      const val = parseInt(part, 10);
      if (val >= min && val <= max) {
        values.add(val);
      }
    }
  }

  return { values: Array.from(values).sort((a, b) => a - b), all: false };
}

function parseRange(range: string, min: number, max: number): [number, number] {
  const [startStr, endStr] = range.split('-');
  const start = parseInt(startStr, 10) || min;
  const end = parseInt(endStr, 10) || max;
  return [Math.max(start, min), Math.min(end, max)];
}

/**
 * Check if a date matches the cron expression
 */
export function matchesCron(date: Date, cron: ParsedCron): boolean {
  const minute = date.getMinutes();
  const hour = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay();

  return (
    matchesField(minute, cron.minute) &&
    matchesField(hour, cron.hour) &&
    matchesField(dayOfMonth, cron.dayOfMonth) &&
    matchesField(month, cron.month) &&
    matchesField(dayOfWeek, cron.dayOfWeek)
  );
}

function matchesField(value: number, field: CronField): boolean {
  if (field.all) return true;
  return field.values.includes(value);
}

/**
 * Get the next date that matches the cron expression
 */
export function getNextCronDate(cron: ParsedCron, fromDate: Date = new Date()): Date {
  const result = new Date(fromDate);
  result.setSeconds(0, 0);
  result.setMinutes(result.getMinutes() + 1);

  // Limit search to prevent infinite loops
  const maxIterations = 527040; // ~1 year worth of minutes

  for (let i = 0; i < maxIterations; i++) {
    if (matchesCron(result, cron)) {
      return result;
    }
    result.setMinutes(result.getMinutes() + 1);
  }

  throw new Error('Could not find next cron date within one year');
}

/**
 * Get the previous date that matches the cron expression
 */
export function getPrevCronDate(cron: ParsedCron, fromDate: Date = new Date()): Date {
  const result = new Date(fromDate);
  result.setSeconds(0, 0);
  result.setMinutes(result.getMinutes() - 1);

  const maxIterations = 527040;

  for (let i = 0; i < maxIterations; i++) {
    if (matchesCron(result, cron)) {
      return result;
    }
    result.setMinutes(result.getMinutes() - 1);
  }

  throw new Error('Could not find previous cron date within one year');
}

/**
 * Simple cron scheduler
 */
export class CronScheduler {
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  schedule(id: string, expression: string, callback: () => void): void {
    const cron = parseCronExpression(expression);

    const scheduleNext = () => {
      const now = new Date();
      const next = getNextCronDate(cron, now);
      const delay = next.getTime() - now.getTime();

      const timer = setTimeout(() => {
        callback();
        scheduleNext();
      }, delay);

      this.timers.set(id, timer);
    };

    scheduleNext();
  }

  stop(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  stopAll(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
}

/**
 * Validate a cron expression
 */
export function isValidCronExpression(expression: string): boolean {
  try {
    parseCronExpression(expression);
    return true;
  } catch {
    return false;
  }
}
