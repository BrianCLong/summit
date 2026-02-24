import { describe, it, expect } from 'vitest';
import { Router } from '../src/router.js';
import { InMemoryRegistry } from '../src/registry.js';
import { DenyAllPolicyClient, AllowAllPolicyClient } from '../src/policy.js';
import { DisabledCredentialBroker } from '../src/credentials.js';
import { Request } from '../src/types.js';

describe('Summit Switchboard Router', () => {
  const request: Request = {
    tenantId: 'tenant-1',
    actorId: 'user-1',
    capability: 'cap.echo',
    tool: 'echo',
    params: { message: 'hello' }
  };

  it('should deny by default and emit deny receipt', async () => {
    const registry = new InMemoryRegistry();
    registry.register('cap.echo', '1.0.0', 'server-echo');

    const router = new Router(
      registry,
      new DenyAllPolicyClient(),
      new DisabledCredentialBroker()
    );

    const result = await router.routeToolCall(request);

    expect(result.success).toBe(false);
    expect(result.receipt).toBeDefined();
    expect(result.receipt.policy_decision_id).toContain('deny');
    expect(result.receipt.selected_server_id).toBe('server-echo');
    expect(result.receipt.trace_id).toBeDefined();
    expect(result.receipt.outputs_hash).toBeNull();
  });

  it('should allow when policy permits and capability exists', async () => {
    const registry = new InMemoryRegistry();
    registry.register('cap.echo', '1.0.0', 'server-echo');

    const router = new Router(
      registry,
      new AllowAllPolicyClient(),
      new DisabledCredentialBroker()
    );

    const result = await router.routeToolCall(request);

    expect(result.success).toBe(true);
    expect(result.receipt.policy_decision_id).toContain('allow');
    expect(result.receipt.selected_server_id).toBe('server-echo');
    expect(result.receipt.outputs_hash).not.toBeNull();
  });

  it('should generate deterministic trace ID for identical requests', async () => {
    const registry = new InMemoryRegistry();
    const router = new Router(
      registry,
      new DenyAllPolicyClient(),
      new DisabledCredentialBroker()
    );

    const result1 = await router.routeToolCall(request);

    // Identical request, just new object
    const request2 = { ...request, params: { message: 'hello' } };
    const result2 = await router.routeToolCall(request2);

    expect(result1.receipt.trace_id).toBe(result2.receipt.trace_id);
    expect(result1.receipt.inputs_hash).toBe(result2.receipt.inputs_hash);
  });

  it('should generate different trace ID for different params', async () => {
    const registry = new InMemoryRegistry();
    const router = new Router(
      registry,
      new DenyAllPolicyClient(),
      new DisabledCredentialBroker()
    );

    const result1 = await router.routeToolCall(request);
    const result2 = await router.routeToolCall({ ...request, params: { message: 'world' } });

    expect(result1.receipt.trace_id).not.toBe(result2.receipt.trace_id);
  });

  it('should fail if capability not found even if allowed', async () => {
    const registry = new InMemoryRegistry();
    // No capability registered

    const router = new Router(
      registry,
      new AllowAllPolicyClient(),
      new DisabledCredentialBroker()
    );

    const result = await router.routeToolCall(request);

    expect(result.success).toBe(false);
    expect(result.receipt.selected_server_id).toBeNull();
    // Policy allowed it, but routing failed
    expect(result.receipt.policy_decision_id).toContain('allow');
    expect((result as any).error).toBe('Capability not found');
  });
});
