import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';

const ajv = new Ajv({ allErrors: true, strict: false });

function loadSchema(relPath: string): any {
  const schemaPath = path.join(process.cwd(), relPath);
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8')) as any;
}

describe('platform-watch schemas', () => {
  it('validates a minimal report payload', () => {
    const schema = loadSchema('schemas/platform-watch/report.schema.json');
    const validate = ajv.compile(schema);

    const evidenceId = 'EVD-PLAT-MALTEGO-20260205-abcdef12';

    const payload = {
      schema_version: 'platform-watch.report.v1',
      date: '2026-02-05',
      summary: 'Daily platform watch report',
      evidence: [
        {
          id: evidenceId,
          platform: 'Maltego',
          source_url: 'https://example.com/release-notes',
          title: 'Release notes',
          content_hash: 'a'.repeat(64),
        },
      ],
      platforms: [
        {
          id: 'maltego',
          name: 'Maltego',
          status: 'active',
          evidence_refs: [evidenceId],
        },
      ],
      claims: [
        {
          id: 'ITEM:CLAIM-01',
          text: 'No updates',
          platform: 'Maltego',
          evidence_refs: [evidenceId],
        },
      ],
      drift: {
        detected: true,
        reasons: [
          {
            claim_id: 'ITEM:CLAIM-01',
            evidence_id: evidenceId,
            explanation: 'Evidence contradicts no-update claim.',
          },
        ],
      },
    };

    expect(validate(payload)).toBe(true);
  });

  it('validates a minimal kg payload', () => {
    const schema = loadSchema('schemas/platform-watch/kg.schema.json');
    const validate = ajv.compile(schema);

    const payload = {
      schema_version: 'platform-watch.kg.v1',
      nodes: [
        {
          id: 'platform:maltego',
          type: 'Platform',
          label: 'Maltego',
          properties: {
            name: 'Maltego',
          },
        },
      ],
      edges: [
        {
          id: 'edge:platform:maltego:update:1',
          type: 'HAS_UPDATE',
          from: 'platform:maltego',
          to: 'update:maltego:20260205',
          properties: {
            date: '2026-02-05',
          },
        },
      ],
    };

    expect(validate(payload)).toBe(true);
  });
});
