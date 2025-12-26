
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { registry, killSwitchStatus, crossTenantAccessAttempts, agentLoopIterations } from '../../src/observability/metrics-enhanced.js';

describe('Alert Emission Metrics', () => {
  beforeEach(() => {
    registry.clear();
  });

  it('should emit KillSwitchActive metric', async () => {
    killSwitchStatus.labels('global_kill_switch', 'global').set(1);

    const metrics = await registry.metrics();
    expect(metrics).toContain('intelgraph_kill_switch_active{switch_id="global_kill_switch",scope="global"} 1');
  });

  it('should emit CrossTenantAccessAttempts metric', async () => {
    crossTenantAccessAttempts.labels('tenantA', 'tenantB', 'document:123').inc();

    const metrics = await registry.metrics();
    expect(metrics).toContain('intelgraph_security_cross_tenant_access_denied_total{source_tenant="tenantA",target_tenant="tenantB",resource="document:123"} 1');
  });

  it('should emit AgentRunawayLoop metric', async () => {
    agentLoopIterations.labels('agent-123', 'research').observe(60);

    const metrics = await registry.metrics();
    expect(metrics).toContain('intelgraph_agent_loop_iterations_bucket{le="100",agent_id="agent-123",task_type="research"} 1');
    expect(metrics).toContain('intelgraph_agent_loop_iterations_sum{agent_id="agent-123",task_type="research"} 60');
  });
});
