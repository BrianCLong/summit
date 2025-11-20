export class TimeBasedFeatures {
  extractFromDate(date: Date): Record<string, number> {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      dayOfWeek: date.getDay(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      quarter: Math.floor(date.getMonth() / 3) + 1,
      isWeekend: date.getDay() === 0 || date.getDay() === 6 ? 1 : 0,
    };
  }
}
