import { describe, it, expect } from '@jest/globals';
import { ETLAssistant } from '../ingest/etl-assistant.js';

describe('ETLAssistant ingest wizard', () => {
  const assistant = new ETLAssistant();
  const csvSample = `full_name,email,company,ssn,notes
Alice Doe,alice@example.com,ACME Corp,123-45-6789,VIP lead
Bob Roe,bob@corp.com,Globex,987-65-4321,New joiner
`;

  it('infers schema, mappings, and PII flags from CSV sample', async () => {
    const analysis = await assistant.analyzeSample({
      sample: csvSample,
      format: 'csv',
      canonicalEntityId: 'person',
    });

    expect(analysis.entity.id).toBe('person');
    expect(analysis.samplePreview).toHaveLength(2);
    expect(analysis.suggestedMappings['person.fullName']).toBe('full_name');
    expect(analysis.suggestedMappings['person.email']).toBe('email');
    expect(analysis.licenses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'internal-research' }),
        expect.objectContaining({ id: 'partner-data-share' }),
      ]),
    );
    expect(analysis.coverage.required.total).toBeGreaterThan(0);
    expect(analysis.coverage.required.missing).toEqual([]);
    expect(analysis.confidenceScore).toBeGreaterThan(0.5);
    expect(Array.isArray(analysis.warnings)).toBe(true);
    expect(analysis.mappingConfidence.high + analysis.mappingConfidence.medium + analysis.mappingConfidence.low).toBe(
      analysis.fieldAnalyses.length,
    );
    expect(Array.isArray(analysis.unmappedSourceFields)).toBe(true);
    expect(analysis.analysisDurationMs).toBeGreaterThan(0);
    expect(analysis.dataQuality.rowCount).toBe(2);
    expect(analysis.dataQuality.averageCompleteness).toBeGreaterThanOrEqual(0);
    expect(analysis.dataQuality.averageCompleteness).toBeLessThanOrEqual(1);
    expect(Array.isArray(analysis.dataQuality.emptyFieldRatios)).toBe(true);
    expect(Array.isArray(analysis.dataQuality.issues)).toBe(true);

    const emailField = analysis.fieldAnalyses.find((field) => field.sourceField === 'email');
    expect(emailField?.pii?.severity).toBe('moderate');
    expect(emailField?.pii?.reasons.join(' ')).toMatch(/email pattern/i);

    const ssnField = analysis.fieldAnalyses.find((field) => field.sourceField === 'ssn');
    expect(ssnField?.blocked).toBe(true);
    expect(ssnField?.blockedReasons.join(' ')).toMatch(/policy/i);
    expect(ssnField?.lineage.transforms).toContain('redaction-required');
    expect(analysis.requiredFieldIssues).toEqual([]);
  });

  it('builds transform spec with lineage and redaction presets', async () => {
    const mappings = {
      'person.fullName': 'full_name',
      'person.email': 'email',
      'person.organization': 'company',
      'person.nationalId': 'ssn',
    };
    const piiDecisions = {
      'person.email': { preset: 'mask' as const },
      'person.nationalId': { preset: 'drop' as const },
    };

    const spec = await assistant.buildTransformSpec({
      sample: csvSample,
      format: 'csv',
      entityId: 'person',
      mappings,
      piiDecisions,
      licenseId: 'partner-data-share',
    });

    expect(spec.fields).toHaveLength(4);
    const emailSpec = spec.fields.find((field) => field.canonicalField === 'person.email');
    expect(emailSpec?.pii?.redaction).toBe('mask');
    expect(emailSpec?.lineage.sourceField).toBe('email');
    expect(spec.policies.license).toContain('partner-data-share');

    const dryRun = await assistant.runDryRun(spec, csvSample, 'csv', piiDecisions);
    expect(dryRun.previewRows[0]['person.email']).toMatch(/^\*+/);
    expect(dryRun.previewRows[0]).not.toHaveProperty('person.nationalId');
    expect(dryRun.previewRows[0]['person.fullName__lineage']).toMatchObject({ source: 'full_name' });
  });

  it('enforces required mappings when missing', async () => {
    await expect(
      assistant.buildTransformSpec({
        sample: csvSample,
        format: 'csv',
        entityId: 'person',
        mappings: {
          'person.email': 'email',
        },
      }),
    ).rejects.toThrow('Missing required mappings');
  });

  it('flags coverage and warnings when required fields are absent in the sample', async () => {
    const analysis = await assistant.analyzeSample({
      sample: `email,company,notes\nalice@example.com,ACME,VIP`,
      format: 'csv',
      canonicalEntityId: 'person',
    });

    expect(analysis.requiredFieldIssues).toContain('Full Name (person.fullName) is required');
    expect(analysis.coverage.required.missing).toContain('Full Name');
    expect(analysis.warnings.join(' ')).toMatch(/Missing mappings for required fields/);
    expect(Array.isArray(analysis.unmappedSourceFields)).toBe(true);
  });

  it('evaluates license constraints based on PII findings', async () => {
    const analysis = await assistant.analyzeSample({ sample: csvSample, format: 'csv', canonicalEntityId: 'person' });
    const restricted = assistant.evaluateLicense({
      licenseId: 'internal-research',
      accepted: true,
      piiFlags: analysis.piiFlags,
    });
    expect(restricted.allowed).toBe(false);
    expect(restricted.issues.join(' ')).toMatch(/restricted PII/i);

    const allowed = assistant.evaluateLicense({
      licenseId: 'partner-data-share',
      accepted: true,
      piiFlags: analysis.piiFlags,
    });
    expect(allowed.allowed).toBe(true);
  });

  it('exposes metadata for UI bootstrapping', () => {
    const metadata = assistant.getMetadata();
    expect(metadata.entities).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'person' })]));
    expect(metadata.licenses).toHaveLength(3);
    expect(metadata.redactionPresets.map((preset) => preset.id)).toEqual(
      expect.arrayContaining(['mask', 'hash', 'drop']),
    );
  });
});
