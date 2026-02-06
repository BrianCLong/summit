import { normalizeOpsEvent } from './normalize';
import { NormalizedOpsEvent, OpsEvent } from './types';

type OmcHookPayload = {
  events?: OpsEvent[];
  timeline?: OpsEvent[];
  event?: OpsEvent;
};

const isOpsEventArray = (value: unknown): value is OpsEvent[] =>
  Array.isArray(value);

const isOpsEvent = (value: unknown): value is OpsEvent =>
  typeof value === 'object' && value !== null && 'type' in value;

export const normalizeOmcHookPayload = (
  payload: unknown,
): NormalizedOpsEvent[] => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid OMC payload');
  }

  const { events, timeline, event } = payload as OmcHookPayload;
  const rawEvents = isOpsEventArray(events)
    ? events
    : isOpsEventArray(timeline)
      ? timeline
      : isOpsEvent(event)
        ? [event]
        : [];

  if (rawEvents.length === 0) {
    throw new Error('No ops events found in OMC payload');
  }

  return rawEvents.map((entry) => normalizeOpsEvent(entry));
};
