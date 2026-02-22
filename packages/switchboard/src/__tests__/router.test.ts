import { jest } from '@jest/globals';
import { SwitchboardRouter } from '../router.js';
import { InMemoryRegistry } from '../registry.js';
import { DenyAllPolicyClient } from '../policy.js';
import { DisabledCredentialBroker } from '../credential.js';
import { RoutingOutcome, ToolCallRequest, PolicyDecision } from '../types.js';

describe('SwitchboardRouter', () => {
  let registry: InMemoryRegistry;
  let policyClient: DenyAllPolicyClient;
  let credentialBroker: DisabledCredentialBroker;
  let router: SwitchboardRouter;

  beforeEach(() => {
    registry = new InMemoryRegistry();
    policyClient = new DenyAllPolicyClient();
    credentialBroker = new DisabledCredentialBroker();
    router = new SwitchboardRouter(registry, policyClient, credentialBroker);

    registry.registerCapability({
      id: 'test-capability',
      name: 'Test Capability',
      version: '1.0.0'
    });
  });

  test('Routing without allow → DENY + receipt with reasons', async () => {
    const request: ToolCallRequest = {
      tenantId: 'tenant-1',
      actorId: 'actor-1',
      capabilityId: 'test-capability',
      inputs: { key: 'value' }
    };

    const response = await router.routeToolCall(request);

    expect(response.outcome).toBe(RoutingOutcome.DENY);
    expect(response.receipt.policy_reasons).toContain('Deny by default policy in effect');
    expect(response.receipt.selected_server_id).toBeNull();
  });

  test('Routing with explicit allow → SUCCESS + receipt emitted', async () => {
    const allowPolicy = {
      evaluate: async (req: ToolCallRequest): Promise<PolicyDecision> => ({
        allowed: true,
        decisionId: 'allow-test',
        reasons: ['Explicit allow for test'],
        obligations: []
      })
    };
    const routerWithAllow = new SwitchboardRouter(registry, allowPolicy, credentialBroker);

    const request: ToolCallRequest = {
      tenantId: 'tenant-1',
      actorId: 'actor-1',
      capabilityId: 'test-capability',
      inputs: { key: 'value' }
    };

    const response = await routerWithAllow.routeToolCall(request);

    expect(response.outcome).toBe(RoutingOutcome.SUCCESS);
    expect(response.receipt.policy_decision_id).toBe('allow-test');
    expect(response.receipt.selected_server_id).toBe('stub-server-001');
  });

  test('Deterministic trace_id for identical inputs', async () => {
    const request1: ToolCallRequest = {
      tenantId: 'tenant-1',
      actorId: 'actor-1',
      capabilityId: 'test-capability',
      inputs: { key: 'value' }
    };

    const request2: ToolCallRequest = {
      tenantId: 'tenant-1',
      actorId: 'actor-1',
      capabilityId: 'test-capability',
      inputs: { key: 'value' }
    };

    const response1 = await router.routeToolCall(request1);
    const response2 = await router.routeToolCall(request2);

    expect(response1.receipt.trace_id).toBe(response2.receipt.trace_id);

    const request3: ToolCallRequest = {
        tenantId: 'tenant-1',
        actorId: 'actor-1',
        capabilityId: 'test-capability',
        inputs: { key: 'different' }
      };
    const response3 = await router.routeToolCall(request3);
    expect(response3.receipt.trace_id).not.toBe(response1.receipt.trace_id);
  });

  test('Credential broker is called ONLY after allow', async () => {
    const bindSpy = jest.spyOn(credentialBroker, 'bind');

    const request: ToolCallRequest = {
      tenantId: 'tenant-1',
      actorId: 'actor-1',
      capabilityId: 'test-capability',
      inputs: { key: 'value' }
    };

    // Case 1: Deny
    await router.routeToolCall(request);
    expect(bindSpy).not.toHaveBeenCalled();

    // Case 2: Allow
    const allowPolicy = {
        evaluate: async (req: ToolCallRequest): Promise<PolicyDecision> => ({
          allowed: true,
          decisionId: 'allow-test',
          reasons: ['Explicit allow for test'],
          obligations: []
        })
      };
    const routerWithAllow = new SwitchboardRouter(registry, allowPolicy, credentialBroker);
    await routerWithAllow.routeToolCall(request);
    expect(bindSpy).toHaveBeenCalled();
  });
});
