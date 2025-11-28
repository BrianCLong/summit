import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SummitQAF } from '../qaf/factory';
import { AgentConfig } from '../qaf/types';

describe('SummitQAF Factory', () => {
  let factory: SummitQAF;

  beforeEach(() => {
    factory = new SummitQAF();
  });

  it('should spawn a quantum-secure agent with mTLS identity', async () => {
    const config: AgentConfig = {
      name: 'TestAgent',
      role: 'PRReviewer',
      tenantId: 'tenant-1',
      capabilities: ['code-review'],
      securityLevel: 'quantum-secure',
    };

    const identity = await factory.spawnAgent(config);

    expect(identity).toBeDefined();
    expect(identity.id).toBeDefined();
    expect(identity.quantumSafe).toBe(true);
    expect(identity.certificate).toContain('BEGIN CERTIFICATE');
  });

  it('should track ROI metrics', async () => {
    const config: AgentConfig = {
      name: 'ROIAgent',
      role: 'FactoryAgent',
      tenantId: 'tenant-1',
      capabilities: [],
      securityLevel: 'standard',
    };

    await factory.spawnAgent(config);
    const metrics = factory.getTelemetry();

    expect(metrics.tasksCompleted).toBeGreaterThan(0);
    expect(metrics.complianceScore).toBe(100);
  });

  it('should detect quantum vulnerabilities', async () => {
    const secureConfig: AgentConfig = {
      name: 'SecureAgent',
      role: 'GovEnforcer',
      tenantId: 'tenant-1',
      capabilities: [],
      securityLevel: 'quantum-secure',
    };
    await factory.spawnAgent(secureConfig);

    const vulnerableConfig: AgentConfig = {
      name: 'WeakAgent',
      role: 'LeakHunter',
      tenantId: 'tenant-1',
      capabilities: [],
      securityLevel: 'standard', // Vulnerable
    };
    await factory.spawnAgent(vulnerableConfig);

    const scanResult = await factory.runQuantumScan();

    expect(scanResult.secure).toBe(false);
    expect(scanResult.vulnerableAgents.length).toBe(1);
  });
});
