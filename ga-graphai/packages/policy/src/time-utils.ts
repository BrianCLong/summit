export function differenceInCalendarDays(later: Date, earlier: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const utc1 = Date.UTC(
    later.getUTCFullYear(),
    later.getUTCMonth(),
    later.getUTCDate(),
  );
  const utc2 = Date.UTC(
    earlier.getUTCFullYear(),
    earlier.getUTCMonth(),
    earlier.getUTCDate(),
  );
  return Math.floor((utc1 - utc2) / msPerDay);
}

export function isAfter(date: Date, compareTo: Date): boolean {
  return date.getTime() > compareTo.getTime();
}
