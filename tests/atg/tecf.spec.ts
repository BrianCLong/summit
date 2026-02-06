import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildRawRefsMap,
  ensureEvidenceId,
  toTecfNdjson,
  validateTecfEvent,
} from '../../src/graphrag/atg/tecf';
import {
  buildEvidenceId,
  isEvidenceId,
  parseEvidenceId,
} from '../../src/graphrag/atg/evidence';

const fixturePath = join(
  __dirname,
  '..',
  '..',
  'src',
  'graphrag',
  'atg',
  'fixtures',
  'tecf-fixture.json',
);

const fixtureEvents = JSON.parse(
  readFileSync(fixturePath, 'utf8'),
) as Array<Record<string, unknown>>;

describe('TECF fixtures', () => {
  it('validates fixture events and evidence ids', () => {
    const errors = fixtureEvents.flatMap((event) =>
      validateTecfEvent(event as never),
    );

    expect(errors).toEqual([]);

    for (const event of fixtureEvents) {
      const evidenceId = buildEvidenceId({
        tenant: event.tenant_id as string,
        source: event.source as string,
        occurredAt: event.occurred_at as string,
        payload: event,
      });

      expect(isEvidenceId(evidenceId)).toBe(true);
      const parsed = parseEvidenceId(evidenceId);
      expect(parsed?.tenant).toBe('tenant-alpha');
      expect(parsed?.date).toBe('2026-01-15');
    }
  });

  it('produces deterministic TECF ndjson and raw refs map', () => {
    const typedEvents = fixtureEvents.map((event) => ({ ...event }));

    const outputOne = toTecfNdjson(typedEvents as never);
    const outputTwo = toTecfNdjson(typedEvents as never);

    expect(outputOne).toBe(outputTwo);
    expect(outputOne).toContain('"event_type":"saas.audit"');
    expect(outputOne).not.toContain('generated_at');

    const rawRefs = buildRawRefsMap(typedEvents as never);
    const rawRefsTwo = buildRawRefsMap(typedEvents as never);
    expect(rawRefs).toEqual(rawRefsTwo);
  });

  it('ensures events are assigned evidence ids deterministically', () => {
    const typedEvents = fixtureEvents.map((event) => ({ ...event }));
    const evidenceIds = typedEvents.map((event) =>
      ensureEvidenceId(event as never),
    );

    expect(evidenceIds.every((value) => isEvidenceId(value))).toBe(true);
    expect(new Set(evidenceIds).size).toBe(evidenceIds.length);
  });
});
