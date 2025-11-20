/**
 * Missile Test Monitoring
 */

import type { MissileTest, TestType, ConfidenceLevel, GeoLocation } from './types.js';

export class MissileTestMonitor {
  private tests: Map<string, MissileTest[]>;

  constructor() {
    this.tests = new Map();
  }

  recordTest(test: MissileTest): void {
    const existing = this.tests.get(test.missile_system_id) || [];
    existing.push(test);
    this.tests.set(test.missile_system_id, existing);

    if (!test.success) {
      console.log(`Missile test failure: ${test.missile_system_id} on ${test.test_date}`);
    }
  }

  getTests(missileSystemId: string): MissileTest[] {
    return this.tests.get(missileSystemId) || [];
  }

  calculateSuccessRate(missileSystemId: string): number {
    const tests = this.getTests(missileSystemId);
    if (tests.length === 0) return 0;

    const successful = tests.filter(t => t.success).length;
    return (successful / tests.length) * 100;
  }

  getTestTrend(country: string): {
    total_tests: number;
    tests_last_year: number;
    success_rate: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  } {
    const allTests = Array.from(this.tests.values()).flat()
      .filter(t => t.country === country);

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const recentTests = allTests.filter(t =>
      new Date(t.test_date) >= oneYearAgo
    );

    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const previousYearTests = allTests.filter(t => {
      const date = new Date(t.test_date);
      return date >= twoYearsAgo && date < oneYearAgo;
    });

    let trend: 'increasing' | 'stable' | 'decreasing';
    if (recentTests.length > previousYearTests.length * 1.2) {
      trend = 'increasing';
    } else if (recentTests.length < previousYearTests.length * 0.8) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    const successful = allTests.filter(t => t.success).length;
    const success_rate = allTests.length > 0 ? (successful / allTests.length) * 100 : 0;

    return {
      total_tests: allTests.length,
      tests_last_year: recentTests.length,
      success_rate,
      trend
    };
  }

  detectNewCapabilities(missileSystemId: string): string[] {
    const tests = this.getTests(missileSystemId)
      .sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime());

    const capabilities = new Set<string>();
    tests.forEach(t => {
      if (t.new_capabilities) {
        t.new_capabilities.forEach(cap => capabilities.add(cap));
      }
    });

    return Array.from(capabilities);
  }
}
