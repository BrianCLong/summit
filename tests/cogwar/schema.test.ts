import Ajv from 'ajv';
import { readFileSync } from 'node:fs';

const ajv = new Ajv({ allErrors: true, strict: false });

const loadSchema = (relativePath: string) => {
  const schemaText = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  return JSON.parse(schemaText);
};

describe('CogWar schema validation', () => {
  test('campaign object schema validates a minimal campaign', () => {
    const schema = loadSchema('../../src/cogwar/schema/campaign-object.schema.json');
    const validate = ajv.compile(schema);

    const campaign = {
      schema_version: 'cogwar.campaign.v1',
      campaign_id: 'CW-ADAPT-0001',
      narratives: [
        {
          narrative_id: 'NAR-001',
          theme: 'Decision paralysis via conflicting claims',
          frames: ['Delay action', 'Confuse attribution'],
        },
      ],
      indicators: [
        {
          indicator_id: 'IND-001',
          kind: 'variant_proliferation',
          pattern: 'burst-variants',
        },
      ],
      evidence: [
        {
          evidence_id: 'EVD:CW26:ADAPT:FIXTURE01:1A2B3C4D',
          source: 'Fixture corpus',
          locator: 'fixtures/cogwar/adaptivity_ab_pivot.jsonl',
        },
      ],
      attribution: {
        status: 'UNATTRIBUTED',
        confidence: 0,
      },
    };

    expect(validate(campaign)).toBe(true);
  });

  test('campaign object schema rejects missing required fields', () => {
    const schema = loadSchema('../../src/cogwar/schema/campaign-object.schema.json');
    const validate = ajv.compile(schema);

    const invalidCampaign = {
      schema_version: 'cogwar.campaign.v1',
      campaign_id: 'CW-INVALID-0001',
    };

    expect(validate(invalidCampaign)).toBe(false);
  });

  test('evidence bundle schema validates a minimal bundle', () => {
    const schema = loadSchema('../../src/cogwar/schema/evidence-bundle.schema.json');
    const validate = ajv.compile(schema);

    const bundle = {
      schema_version: 'cogwar.evidence.v1',
      evidence_id: 'EVD:CW26:SWARM:FIXTURE01:ABCDEF12',
      detector: {
        name: 'swarm-coordination',
        version: '0.1.0',
      },
      run_id: 'fixture-01',
      artifacts: [
        {
          path: 'evidence/EVD:CW26:SWARM:FIXTURE01:ABCDEF12/report.json',
          sha256: 'deadbeef',
        },
      ],
    };

    expect(validate(bundle)).toBe(true);
  });
});
