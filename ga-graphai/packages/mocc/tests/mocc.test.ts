import { describe, expect, it } from 'vitest';
import {
  explainFailures,
  runCIGate,
  sanitizeOutput,
  type OutputContract,
  validateOutput
} from '../src/index.js';

describe('validateOutput', () => {
  it('flags seeded regex violations with descriptive messages', () => {
    const contract: OutputContract<string> = {
      regex: { pattern: '^\\d+$', description: 'numeric identifier' }
    };
    const result = validateOutput('abc123', contract);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.message).toContain('pattern');
    expect(result.errors[0]?.meta).toMatchObject({ pattern: '^\\d+$' });
  });

  it('collects schema violations with precise paths', () => {
    const contract: OutputContract = {
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok'] }
        },
        required: ['status'],
        additionalProperties: false
      }
    };

    const result = validateOutput({ status: 'error', extra: true }, contract);
    expect(result.valid).toBe(false);
    const messages = result.errors.map((error) => error.message).join(' ');
    expect(messages).toContain('allowed');
    const paths = result.errors.map((error) => error.path);
    expect(paths).toContain('status');
  });

  it('detects PII when sanitization is disabled', () => {
    const contract: OutputContract<string> = { forbidsPII: true };
    const result = validateOutput('Reach me at jane.doe@example.com', contract);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe('constraint.pii');
    expect(result.errors[0]?.message).toContain('email');
  });

  it('sanitizes seeded PII without semantic drift when enabled', () => {
    const text = 'Reach me at jane.doe@example.com for the final report. It is confidential.';
    const contract: OutputContract<string> = {
      forbidsPII: { replacement: '[redacted:%type%]' },
      length: { max: 80 }
    };

    const sanitized = sanitizeOutput(text, contract);
    expect(sanitized.value).toContain('[redacted:email]');
    expect(sanitized.actions.some((action) => action.code === 'sanitize.pii')).toBe(true);

    const result = validateOutput(text, contract, { sanitize: true });
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe(true);
    expect(result.value).toContain('final report');
  });

  it('clamps numeric ranges during sanitization', () => {
    const contract: OutputContract<number> = { range: { min: 0, max: 100 } };
    const result = validateOutput(150, contract, { sanitize: true });
    expect(result.valid).toBe(true);
    expect(result.value).toBe(100);
    expect(result.sanitizationActions.some((action) => action.code === 'sanitize.range')).toBe(true);
  });

  it('canonicalizes locale metadata and validates allowed locales', () => {
    const contract: OutputContract<{ text: string; metadata: { locale: string } }> = {
      locale: { allowed: ['en-US', 'fr-FR'], canonicalize: true, path: 'metadata.locale' }
    };

    const output = { text: 'Hello', metadata: { locale: 'en-us' } };
    const result = validateOutput(output, contract, { sanitize: true });

    expect(result.valid).toBe(true);
    expect(result.value.metadata.locale).toBe('en-US');
    expect(result.sanitizationActions.some((action) => action.code === 'sanitize.locale')).toBe(true);

    const failing = validateOutput({ text: 'Bonjour', metadata: { locale: 'es-ES' } }, contract);
    expect(failing.valid).toBe(false);
    expect(failing.errors[0]?.code).toBe('constraint.locale');
  });
});

describe('runCIGate', () => {
  it('throws an aggregate error when any validation fails', () => {
    const contract: OutputContract<string> = {
      regex: { pattern: '^success$' }
    };

    expect(() =>
      runCIGate([
        { name: 'ok', output: 'success', contract },
        { name: 'bad', output: 'failure', contract }
      ])
    ).toThrow(/MOCC CI gate failed/);
  });

  it('returns reports when all validations pass', () => {
    const reports = runCIGate([
      {
        name: 'sanitized-range',
        output: 120,
        contract: { range: { max: 120 } },
        sanitize: true
      }
    ]);

    expect(reports[0]?.result.valid).toBe(true);
  });
});

describe('explainFailures', () => {
  it('formats validation failures into an explainable string', () => {
    const explanation = explainFailures([
      { code: 'constraint.regex', message: 'Value did not match pattern', path: 'output' }
    ]);

    expect(explanation).toContain('constraint.regex');
    expect(explanation).toContain('output');
  });
});
