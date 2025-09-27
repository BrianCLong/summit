import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { compileContract, diffContracts, hasBreakingChanges, regenerateGoldenSamples } from '../../src/contract-gate';
import type { DataContract } from '../../src/contract-gate/types';

function writeContract(dir: string, name: string, contract: DataContract): string {
  const filePath = path.join(dir, `${name}.json`);
  writeFileSync(filePath, JSON.stringify(contract, null, 2));
  return filePath;
}

describe('contract-gate end-to-end', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), 'contract-gate-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  const baseContract: DataContract = {
    name: 'Orders',
    version: '1.0.0',
    schemaType: 'json',
    schema: {
      properties: {
        orderId: { type: 'string' },
        amount: { type: 'number' },
      },
      required: ['orderId', 'amount'],
    },
    semantics: {
      summary: 'Orders emitted from checkout',
      fields: {
        orderId: { description: 'Unique order identifier', required: true },
        amount: { description: 'Order total in USD', required: true },
      },
    },
    serviceLevel: {
      freshnessMinutes: 5,
      availabilityPercent: 99.9,
    },
    goldenSamples: [
      {
        orderId: 'ORD-1',
        amount: 42.13,
      },
    ],
  };

  it('detects breaking changes when a required field is removed', () => {
    const target: DataContract = {
      ...baseContract,
      version: '2.0.0',
      schema: {
        properties: {
          orderId: { type: 'string' },
        },
        required: ['orderId'],
      },
    };
    const diffs = diffContracts(baseContract, target);
    expect(hasBreakingChanges(diffs)).toBe(true);
    expect(diffs.map((diff) => diff.message)).toEqual(
      expect.arrayContaining([expect.stringContaining('Field "amount" was removed')])
    );
  });

  it('treats optional additions as non-breaking for consumers', () => {
    const target: DataContract = {
      ...baseContract,
      version: '1.1.0',
      schema: {
        properties: {
          ...((baseContract.schema as any).properties ?? {}),
          channel: { type: 'string', nullable: true },
        },
        required: ['orderId', 'amount'],
      },
      semantics: {
        ...baseContract.semantics,
        fields: {
          ...baseContract.semantics?.fields,
          channel: { description: 'Optional marketing channel', required: false },
        },
      },
    };
    const diffs = diffContracts(baseContract, target);
    expect(hasBreakingChanges(diffs)).toBe(false);
    expect(diffs.some((diff) => diff.field === 'channel' && diff.severity === 'non-breaking')).toBe(true);
  });

  it('compiles provider/consumer tests, GitHub Action, and HTML report', async () => {
    const basePath = writeContract(tmpDir, 'orders-base', baseContract);
    const target: DataContract = {
      ...baseContract,
      version: '2.0.0',
      schema: {
        properties: {
          ...((baseContract.schema as any).properties ?? {}),
          channel: { type: 'string', nullable: true },
        },
        required: ['orderId', 'amount'],
      },
      semantics: {
        ...baseContract.semantics,
        fields: {
          ...baseContract.semantics?.fields,
          channel: { description: 'Optional marketing channel', required: false },
        },
      },
    };
    const targetPath = writeContract(tmpDir, 'orders-target', target);
    const artifacts = await compileContract({
      contractPath: targetPath,
      baselinePath: basePath,
      outputDir: path.join(tmpDir, 'output'),
      regenerateSamples: true,
    });
    expect(readFileSync(artifacts.providerTestsPath, 'utf8')).toContain('provider contract');
    expect(readFileSync(artifacts.consumerTestsPath, 'utf8')).toContain('consumer compatibility');
    expect(readFileSync(artifacts.githubActionPath, 'utf8')).toContain('Contract Gate');
    expect(readFileSync(artifacts.htmlReportPath, 'utf8')).toContain('<html>');
    expect(artifacts.goldenSamplePath).toBeDefined();
  });

  it('regenerates golden samples when requested', async () => {
    const contractPath = writeContract(tmpDir, 'orders', baseContract);
    const fixtureDir = path.join(tmpDir, 'fixtures');
    const samplePath = await regenerateGoldenSamples({ contractPath, outputDir: fixtureDir });
    const contents = JSON.parse(readFileSync(samplePath, 'utf8'));
    expect(Array.isArray(contents)).toBe(true);
    expect(contents[0]).toHaveProperty('orderId');
  });
});
