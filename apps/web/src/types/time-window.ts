export type Granularity = 'minute' | 'hour' | 'day';
export type TimezoneMode = 'UTC' | 'LOCAL';

export interface TimeWindow {
  startMs: number;
  endMs: number;
  granularity: Granularity;
  tzMode: TimezoneMode;
  seq: number;
}
