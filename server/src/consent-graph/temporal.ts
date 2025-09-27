import { ConsentEdgeRecord, TimeInterval } from './types.ts';

export function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function isActiveAt(interval: TimeInterval, at: Date): boolean {
  const start = toDate(interval.start);
  if (at < start) {
    return false;
  }
  if (interval.end) {
    const end = toDate(interval.end);
    if (at >= end) {
      return false;
    }
  }
  return true;
}

export function selectActiveRecords(records: ConsentEdgeRecord[], validAt: Date, txAt: Date) {
  return records.filter((record) => isActiveAt(record.validInterval, validAt) && isActiveAt(record.txInterval, txAt));
}
