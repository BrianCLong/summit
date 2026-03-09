import { describe, it, expect, vi } from 'vitest';
import { PipelineManager, AuthContext } from './pipeline-manager';
import { PipelineContract } from './schema';
import { Pool } from 'pg';

describe('PipelineManager Governance', () => {
  const mockPool = {} as Pool;
  const manager = new PipelineManager(mockPool);

  const baseContract: PipelineContract = {
    apiVersion: 'summit.io/v1',
    kind: 'Pipeline',
    metadata: {
      name: 'governance-test',
      owners: ['ops@summit.io'],
    },
    spec: {
      source: { connector: 's3', config: {} },
      transformations: [],
      destination: { connector: 'pg', config: {} },
      slo_targets: { latency_p95_ms: 1000, success_rate_percent: 99 },
      governance_tags: [],
    },
  };

  it('should allow public pipelines for anyone', () => {
    const contract = { ...baseContract, spec: { ...baseContract.spec, governance_tags: ['public'] } };
    const auth: AuthContext = { permissions: [] };
    expect(() => manager.checkGovernance(contract, auth)).not.toThrow();
  });

  it('should reject restricted pipelines without restricted permission', () => {
    const contract = { ...baseContract, spec: { ...baseContract.spec, governance_tags: ['restricted'] } };
    const auth: AuthContext = { permissions: [] };
    expect(() => manager.checkGovernance(contract, auth)).toThrow('Access denied: restricted pipeline');
  });

  it('should allow restricted pipelines with restricted permission', () => {
    const contract = { ...baseContract, spec: { ...baseContract.spec, governance_tags: ['restricted'] } };
    const auth: AuthContext = { permissions: ['access:restricted'] };
    expect(() => manager.checkGovernance(contract, auth)).not.toThrow();
  });

  it('should reject classified pipelines without classified permission', () => {
    const contract = { ...baseContract, spec: { ...baseContract.spec, governance_tags: ['classified'] } };
    const auth: AuthContext = { permissions: ['access:restricted'] }; // Even with restricted, classified should fail
    expect(() => manager.checkGovernance(contract, auth)).toThrow('Access denied: classified pipeline');
  });

  it('should allow classified pipelines with classified permission', () => {
    const contract = { ...baseContract, spec: { ...baseContract.spec, governance_tags: ['classified'] } };
    const auth: AuthContext = { permissions: ['access:classified'] };
    expect(() => manager.checkGovernance(contract, auth)).not.toThrow();
  });

  it('should runPipeline successfully if governance check passes', async () => {
    const contract = { ...baseContract, spec: { ...baseContract.spec, governance_tags: ['public'] } };
    const auth: AuthContext = { permissions: [] };
    const consoleSpy = vi.spyOn(console, 'log');

    await manager.runPipeline(contract, auth, { type: 'bulk' });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Running pipeline: governance-test'));
    consoleSpy.mockRestore();
  });

  it('should fail runPipeline if governance check fails', async () => {
    const contract = { ...baseContract, spec: { ...baseContract.spec, governance_tags: ['restricted'] } };
    const auth: AuthContext = { permissions: [] };

    await expect(manager.runPipeline(contract, auth, { type: 'bulk' }))
      .rejects.toThrow('Access denied: restricted pipeline');
  });
});
