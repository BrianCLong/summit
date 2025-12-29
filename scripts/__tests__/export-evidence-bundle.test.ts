import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { generateEvidenceBundle } from '../export-evidence-bundle';

type JsonSchema = Parameters<Ajv['compile']>[0];

const manifestSchema: JsonSchema = {
  type: 'object',
  properties: {
    manifestVersion: { const: 'evidence-bundle/0.1' },
    generatedAt: { type: 'string', format: 'date-time' },
    input: {
      type: 'object',
      properties: {
        receiptId: { type: 'string' },
        timeRange: {
          type: 'object',
          properties: {
            from: { type: 'string', format: 'date-time' },
            to: { type: 'string', format: 'date-time' },
          },
          required: ['from', 'to'],
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    schemaVersions: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
    },
    receipts: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          receiptId: { type: 'string' },
          recordIds: {
            type: 'array',
            items: { type: 'string' },
          },
          ledgerEntries: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                ref: { type: 'string' },
                type: { type: 'string' },
                schema: { type: 'string' },
              },
              required: ['id', 'ref', 'type', 'schema'],
              additionalProperties: false,
            },
          },
          redactions: {
            type: 'object',
            properties: {
              hasRedactions: { type: 'boolean' },
              fields: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['hasRedactions', 'fields'],
            additionalProperties: false,
          },
        },
        required: ['receiptId', 'recordIds', 'ledgerEntries', 'redactions'],
        additionalProperties: false,
      },
    },
  },
  required: ['manifestVersion', 'generatedAt', 'input', 'schemaVersions', 'receipts'],
  additionalProperties: false,
};

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validateManifest = ajv.compile(manifestSchema);

describe('export-evidence-bundle manifest', () => {
  it('emits schema-compliant output with expected schema versions', () => {
    const manifest = generateEvidenceBundle({ receiptId: 'receipt-001' });

    expect(validateManifest(manifest)).toBe(true);
    expect(manifest.schemaVersions).toEqual(
      expect.arrayContaining(['Receipt v0.1', 'PolicyDecision v0.1']),
    );
    expect(manifest.receipts[0].redactions.hasRedactions).toBe(true);
  });

  it('is deterministic for identical inputs', () => {
    const first = generateEvidenceBundle({
      from: '2024-11-01T00:00:00Z',
      to: '2024-12-31T23:59:59Z',
    });
    const second = generateEvidenceBundle({
      from: '2024-11-01T00:00:00Z',
      to: '2024-12-31T23:59:59Z',
    });

    expect(first).toEqual(second);
    expect(JSON.stringify(first, null, 2)).toMatchSnapshot();
  });
});
