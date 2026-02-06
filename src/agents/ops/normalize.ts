import { ALLOWED_EVENT_TYPES } from './allowlist';
import { NormalizedOpsEvent, OpsEvent } from './types';

const ALLOWED_KEYS = new Set([
  'type',
  'tool_name',
  'tool_input',
  'tool_response',
  'session_id',
  'cwd',
  'toolName',
  'toolInput',
  'toolOutput',
  'sessionId',
  'directory',
]);

const assertAllowedKeys = (event: OpsEvent): void => {
  Object.keys(event).forEach((key) => {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error(`Unknown ops event field: ${key}`);
    }
  });
};

const assertAllowedType = (eventType: string): void => {
  if (!ALLOWED_EVENT_TYPES.has(eventType)) {
    throw new Error(`Unknown ops event type: ${eventType}`);
  }
};

export const normalizeOpsEvent = (event: OpsEvent): NormalizedOpsEvent => {
  assertAllowedKeys(event);
  assertAllowedType(event.type);

  return {
    type: event.type,
    toolName: event.tool_name ?? event.toolName,
    toolInput: event.tool_input ?? event.toolInput,
    toolOutput: event.tool_response ?? event.toolOutput,
    sessionId: event.session_id ?? event.sessionId,
    directory: event.cwd ?? event.directory,
  };
};
