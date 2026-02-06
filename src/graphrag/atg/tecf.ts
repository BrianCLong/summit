import {
  buildEvidenceId,
  EvidenceId,
  isEvidenceId,
  stableJsonStringify,
} from './evidence';

export type TenantId = string;
export type SourceId = string;

export interface TecfActor {
  id: string;
  type: 'identity' | 'service' | 'system';
  display?: string;
}

export interface TecfTarget {
  id: string;
  type: 'object' | 'application' | 'identity' | 'resource';
  display?: string;
}

export interface TecfRawRef {
  source_event_id: string;
  storage_ref?: string;
  checksum_sha256?: string;
}

export interface TecfEvent {
  tenant_id: TenantId;
  source: SourceId;
  occurred_at: string;
  event_type: string;
  actor: TecfActor;
  target?: TecfTarget;
  action: string;
  payload: Record<string, unknown>;
  evidence_id?: EvidenceId;
  raw_ref?: TecfRawRef;
}

export interface TecfValidationError {
  field: string;
  message: string;
}

export function buildEvidenceIdForEvent(event: TecfEvent): EvidenceId {
  return buildEvidenceId({
    tenant: event.tenant_id,
    source: event.source,
    occurredAt: event.occurred_at,
    payload: {
      event_type: event.event_type,
      actor: event.actor,
      target: event.target ?? null,
      action: event.action,
      payload: event.payload,
      raw_ref: event.raw_ref ?? null,
    },
  });
}

export function ensureEvidenceId(event: TecfEvent): EvidenceId {
  if (event.evidence_id) {
    return event.evidence_id;
  }

  const evidenceId = buildEvidenceIdForEvent(event);
  event.evidence_id = evidenceId;
  return evidenceId;
}

export function validateTecfEvent(event: TecfEvent): TecfValidationError[] {
  const errors: TecfValidationError[] = [];

  if (!event.tenant_id) {
    errors.push({ field: 'tenant_id', message: 'tenant_id is required' });
  }
  if (!event.source) {
    errors.push({ field: 'source', message: 'source is required' });
  }
  if (!event.occurred_at) {
    errors.push({ field: 'occurred_at', message: 'occurred_at is required' });
  }
  if (!event.event_type) {
    errors.push({ field: 'event_type', message: 'event_type is required' });
  }
  if (!event.action) {
    errors.push({ field: 'action', message: 'action is required' });
  }
  if (!event.actor?.id) {
    errors.push({ field: 'actor.id', message: 'actor.id is required' });
  }
  if (!event.actor?.type) {
    errors.push({ field: 'actor.type', message: 'actor.type is required' });
  }
  if (!event.payload || typeof event.payload !== 'object') {
    errors.push({ field: 'payload', message: 'payload is required' });
  }

  if (event.evidence_id && !isEvidenceId(event.evidence_id)) {
    errors.push({
      field: 'evidence_id',
      message: 'evidence_id must match EVID format',
    });
  }

  if (event.raw_ref?.checksum_sha256) {
    const valid = /^[a-f0-9]{64}$/.test(event.raw_ref.checksum_sha256);
    if (!valid) {
      errors.push({
        field: 'raw_ref.checksum_sha256',
        message: 'checksum_sha256 must be 64 hex chars',
      });
    }
  }

  return errors;
}

export function assertTecfEvent(event: TecfEvent): void {
  const errors = validateTecfEvent(event);
  if (errors.length) {
    const formatted = errors
      .map((error) => `${error.field}: ${error.message}`)
      .join(', ');
    throw new Error(`Invalid TECF event: ${formatted}`);
  }
}

export function toTecfNdjson(events: TecfEvent[]): string {
  const normalized = events.map((event) => {
    ensureEvidenceId(event);
    return event;
  });

  const ordered = normalized
    .slice()
    .sort((left, right) =>
      (left.evidence_id ?? '').localeCompare(right.evidence_id ?? ''),
    );

  return `${ordered.map((event) => stableJsonStringify(event)).join('\n')}\n`;
}

export function buildRawRefsMap(
  events: TecfEvent[],
): Record<string, TecfRawRef> {
  const map: Record<string, TecfRawRef> = {};

  for (const event of events) {
    ensureEvidenceId(event);
    if (!event.raw_ref) {
      continue;
    }
    map[event.evidence_id as EvidenceId] = event.raw_ref;
  }

  const orderedKeys = Object.keys(map).sort();
  const orderedMap: Record<string, TecfRawRef> = {};
  for (const key of orderedKeys) {
    orderedMap[key] = map[key];
  }

  return orderedMap;
}
