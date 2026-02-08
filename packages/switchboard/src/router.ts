import { Registry } from './registry.js';
import { PolicyClient } from './policy.js';
import { CredentialBroker } from './credential.js';
import {
  ToolCallRequest,
  RoutingResponse,
  RoutingOutcome
} from './types.js';
import { generateActionReceipt } from './receipt.js';

export class SwitchboardRouter {
  constructor(
    private registry: Registry,
    private policyClient: PolicyClient,
    private credentialBroker: CredentialBroker
  ) {}

  /**
   * Routes a tool call request through the control plane.
   * Steps: normalize → capability match → policy preflight → credential bind (stub) → emit receipt → return outcome
   */
  async routeToolCall(request: ToolCallRequest): Promise<RoutingResponse> {
    // 1. Normalize (Request is assumed normalized via ToolCallRequest type)

    // 2. Capability match
    const capability = this.registry.getCapability(request.capabilityId);
    if (!capability) {
      const decision = {
        allowed: false,
        decisionId: 'capability-not-found',
        reasons: [`Capability ${request.capabilityId} is not registered`],
        obligations: []
      };
      const receipt = generateActionReceipt(request, decision, null, null, null);
      return {
        outcome: RoutingOutcome.DENY,
        receipt,
        error: decision.reasons[0]
      };
    }

    // 3. Policy preflight (Deny-by-default via DenyAllPolicyClient)
    const decision = await this.policyClient.evaluate(request);

    if (!decision.allowed) {
      const receipt = generateActionReceipt(request, decision, null, null, null);
      return {
        outcome: RoutingOutcome.DENY,
        receipt
      };
    }

    // 4. Credential bind (Only called after policy allow)
    const grant = await this.credentialBroker.bind(request, decision);

    // 5. Selected Server (Stubbed for now)
    const serverId = 'stub-server-001';

    // 6. Emit receipt
    const receipt = generateActionReceipt(request, decision, grant, null, serverId);

    return {
      outcome: RoutingOutcome.SUCCESS,
      receipt
    };
  }
}
