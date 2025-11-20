/**
 * Nuclear Testing Detection
 *
 * Detects and analyzes nuclear test events through seismic and radionuclide monitoring.
 */

import type { NuclearTest, TestType, ConfidenceLevel, GeoLocation } from './types.js';

export class NuclearTestingDetection {
  private tests: Map<string, NuclearTest>;

  constructor() {
    this.tests = new Map();
  }

  recordTest(test: NuclearTest): void {
    this.tests.set(test.id, test);

    if (test.test_type === TestType.ATMOSPHERIC) {
      console.warn('CRITICAL: Atmospheric nuclear test detected');
    }
  }

  getTests(country?: string): NuclearTest[] {
    const all = Array.from(this.tests.values());
    return country ? all.filter(t => t.country === country) : all;
  }

  estimateYieldFromSeismic(magnitude: number): { yield_kt: number; range: [number, number] } {
    // Empirical relationship: mb = 4.45 + 0.75 * log10(yield)
    // where mb is body wave magnitude and yield is in kilotons
    const log_yield = (magnitude - 4.45) / 0.75;
    const yield_kt = Math.pow(10, log_yield);

    // Uncertainty range (factor of 2)
    const range: [number, number] = [yield_kt / 2, yield_kt * 2];

    return { yield_kt, range };
  }

  analyzeIsotopeSignature(isotopes: string[]): {
    test_type: TestType;
    device_type: 'fission' | 'fusion' | 'boosted' | 'unknown';
    confidence: ConfidenceLevel;
  } {
    let device_type: 'fission' | 'fusion' | 'boosted' | 'unknown' = 'unknown';

    // Fission signatures
    if (isotopes.includes('Xe-133') || isotopes.includes('Kr-85')) {
      device_type = 'fission';
    }

    // Fusion/thermonuclear signatures
    if (isotopes.includes('H-3') || isotopes.includes('C-14')) {
      device_type = isotopes.includes('Pu-239') ? 'boosted' : 'fusion';
    }

    return {
      test_type: TestType.UNDERGROUND,
      device_type,
      confidence: ConfidenceLevel.HIGH
    };
  }

  getTestingTrends(country: string): {
    total_tests: number;
    by_type: Record<string, number>;
    first_test?: string;
    last_test?: string;
    total_yield_estimate: number;
  } {
    const tests = this.getTests(country).sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const by_type: Record<string, number> = {};
    let total_yield = 0;

    tests.forEach(t => {
      by_type[t.test_type] = (by_type[t.test_type] || 0) + 1;
      total_yield += t.yield_estimate || 0;
    });

    return {
      total_tests: tests.length,
      by_type,
      first_test: tests[0]?.timestamp,
      last_test: tests[tests.length - 1]?.timestamp,
      total_yield_estimate: total_yield
    };
  }
}
