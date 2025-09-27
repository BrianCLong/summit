import { describe, expect, it } from 'vitest';
import { analyzeAnnotatedFiles, parseAnnotatedFile } from '../src/index.js';

function parseFixture(filePath: string, content: string) {
  return parseAnnotatedFile(filePath, content);
}

describe('iftc analyzer', () => {
  it('passes safe flows that respect transforms and redactors', () => {
    const tsFixture = `
// @label raw_profile security=high purposes=analytics,marketing
// @label sanitized_profile security=low purposes=analytics,marketing
// @label analytics_feed security=low purposes=analytics
// @transform scrubber kind=transform
// @redactor consent_trim
// @flow raw_profile -> sanitized_profile via scrubber
// @flow sanitized_profile -> analytics_feed via consent_trim
`;

    const result = analyzeAnnotatedFiles([
      parseFixture('etl/pipeline.ts', tsFixture),
    ]);

    expect(result.errors).toHaveLength(0);
    expect(result.flows).toHaveLength(2);
  });

  it('blocks high to low flows without a transform', () => {
    const pyFixture = `
# @label pii_event_stream security=high purposes=analytics
# @label public_dashboard security=low purposes=analytics
# @flow pii_event_stream -> public_dashboard
`;

    const result = analyzeAnnotatedFiles([
      parseFixture('etl/loader.py', pyFixture),
    ]);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe('security-violation');
    expect(result.errors[0].message).toContain('High to low security flow');
    expect(result.errors[0].suggestion).toContain('approved transform');
  });

  it('requires redactors for purpose downgrades', () => {
    const sqlFixture = `
-- @label marketing_pool security=medium purposes=analytics,marketing
-- @label analytics_pool security=medium purposes=analytics
-- @transform normalize_fields kind=transform
-- @flow marketing_pool -> analytics_pool via normalize_fields
`;

    const result = analyzeAnnotatedFiles([
      parseFixture('warehouse/view.sql', sqlFixture),
    ]);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe('purpose-violation');
    expect(result.errors[0].message).toContain('Purpose downgrade');
    expect(result.errors[0].suggestion).toContain('redactor');
  });

  it('produces deterministic diagnostics for repeated runs', () => {
    const gqlFixture = `
# @label consented_profile security=high purposes=personalization,analytics
# @label personalization_payload security=medium purposes=personalization
# @flow consented_profile -> personalization_payload
`;

    const parsed = parseFixture('api/profile.resolver.ts', gqlFixture);
    const runOne = analyzeAnnotatedFiles([parsed]);
    const runTwo = analyzeAnnotatedFiles([parsed]);

    expect(runOne.errors).toEqual(runTwo.errors);
  });
});
