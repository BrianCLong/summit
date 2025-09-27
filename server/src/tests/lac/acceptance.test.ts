import fs from 'node:fs';
import path from 'node:path';
import { compilePolicy, simulate, type SimulationContext } from '@/policy/lac/index.js';

describe('LAC acceptance suite', () => {
  const policyPath = path.join(__dirname, '../../../policies/lac/canned/standard.yaml');
  const policySource = fs.readFileSync(policyPath, 'utf8');
  const { program } = compilePolicy(policySource);

  const corpus: Array<{
    description: string;
    context: SimulationContext;
    expectedStatus: 'allow' | 'block';
    expectedBasis: string;
  }> = [
    {
      description: 'Product listing within US jurisdiction',
      context: {
        operationName: 'listProducts',
        operationType: 'query',
        licenses: ['data-broker-license'],
        warrants: [],
        jurisdiction: 'US',
        retentionDays: 5,
      },
      expectedStatus: 'allow',
      expectedBasis: 'CCPA',
    },
    {
      description: 'Identity resolution without warrant should block',
      context: {
        operationName: 'resolveIdentity',
        operationType: 'query',
        licenses: ['data-broker-license', 'sensitive-personal-data'],
        warrants: [],
        jurisdiction: 'EU',
        retentionDays: 1,
      },
      expectedStatus: 'block',
      expectedBasis: 'GDPR',
    },
    {
      description: 'Export job from EU jurisdiction should block',
      context: {
        operationName: 'createExportJob',
        operationType: 'mutation',
        licenses: ['sensitive-personal-data'],
        warrants: ['warrant-2026-002'],
        jurisdiction: 'EU',
        retentionDays: 10,
      },
      expectedStatus: 'block',
      expectedBasis: 'Bank Secrecy Act',
    },
    {
      description: 'Product listing exceeding retention should block',
      context: {
        operationName: 'listProducts',
        operationType: 'query',
        licenses: ['data-broker-license'],
        warrants: [],
        jurisdiction: 'US',
        retentionDays: 40,
      },
      expectedStatus: 'block',
      expectedBasis: 'CCPA',
    },
  ];

  it('achieves 100% policy enforcement accuracy on corpus', () => {
    const outcomes = corpus.map(scenario => ({
      scenario,
      result: simulate(program, scenario.context),
    }));

    for (const { scenario, result } of outcomes) {
      expect(result.status).toBe(scenario.expectedStatus);
      expect(result.legalBasis).toContain(scenario.expectedBasis);
      if (result.status === 'block') {
        expect(result.reasons.length).toBeGreaterThan(0);
        expect(result.diff.length).toBeGreaterThan(0);
        expect(result.appealHint).toBeTruthy();
      }
    }
  });
});
