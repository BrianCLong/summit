import { describe, it, expect } from 'vitest';
import { DriftReport } from '../src/domain/DriftReport.js';

describe('DriftReport', () => {
  it('detects errors', () => {
    const r = new DriftReport();
    r.add({ code: 'FK_REL_MISSING', severity: 'error', details: {} });
    expect(r.hasErrors()).toBe(true);
  });
});
