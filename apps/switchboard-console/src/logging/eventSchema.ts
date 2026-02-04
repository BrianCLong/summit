import { EventRecord, EventType } from '../types';

const eventTypes: EventType[] = [
  'session_start',
  'step_start',
  'tool_exec',
  'file_read',
  'file_write',
  'tests_run',
  'session_end',
];

export const isEventType = (value: string): value is EventType =>
  eventTypes.includes(value as EventType);

export const validateEventRecord = (record: EventRecord): boolean => {
  if (!record.id || !record.sessionId || !record.timestamp) {
    return false;
  }
  if (!isEventType(record.type)) {
    return false;
  }
  return typeof record.data === 'object' && record.data !== null;
};
