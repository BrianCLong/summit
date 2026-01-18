import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { extractClaims } from '../src/factcheck/claim_extractor.js';

const reports = JSON.parse(
  readFileSync(new URL('../fixtures/reports.sample.json', import.meta.url), 'utf-8'),
);
const golden = JSON.parse(
  readFileSync(new URL('../fixtures/golden-claims.json', import.meta.url), 'utf-8'),
);

describe('claim extractor', () => {
  it('matches golden claim extraction output', () => {
    const output: Record<string, unknown> = {};
    for (const report of reports) {
      output[report.reportId] = extractClaims(report.content);
    }

    expect(output).toEqual(golden);
  });
});
