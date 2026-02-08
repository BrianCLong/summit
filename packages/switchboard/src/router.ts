import { createHash } from 'node:crypto';
// @ts-ignore
import cbor from 'cbor';
import { Request, ControlPlaneReceipt, RoutingResult } from './types.js';
import { Registry } from './registry.js';
import { PolicyClient } from './policy.js';
import { CredentialBroker } from './credentials.js';

export class Router {
  constructor(
    private registry: Registry,
    private policyClient: PolicyClient,
    private credentialBroker: CredentialBroker
  ) {}

  async routeToolCall(request: Request): Promise<RoutingResult> {
    const timestamp = new Date().toISOString();

    // 1. Normalize & Deterministic Trace ID
    // We use CBOR canonical encoding for determinism
    const normalizedInput = {
      tenant: request.tenantId,
      actor: request.actorId,
      cap: request.capability,
      tool: request.tool,
      params: request.params
    };

    // Ensure params keys are sorted if not using canonical encode (but encodeCanonical handles maps)
    // However, JS objects are not ordered maps. cbor.encodeCanonical handles object keys sorting.
    const inputBuffer = cbor.encodeCanonical(normalizedInput);
    const traceId = createHash('sha256').update(inputBuffer).digest('hex');
    const inputsHash = traceId; // Using traceId as inputs_hash since it covers all inputs

    const receiptBase = {
      trace_id: traceId,
      tenant_id: request.tenantId,
      actor_id: request.actorId,
      requested_capability: request.capability,
      inputs_hash: inputsHash,
      timestamp: timestamp,
    };

    // 2. Capability Match
    const capabilityModel = await this.registry.findCapability(request.capability);
    const serverId = capabilityModel?.serverId || null;

    // 3. Policy Preflight
    const policyDecision = await this.policyClient.check(request);

    // 4. Credential Bind (if allowed)
    const credentialGrantId: string | null = null;
    let result: any = null;
    let error: string | null = null;
    let outputsHash: string | null = null;

    if (policyDecision.allowed && serverId) {
      try {
        // Stub: In real world, we'd get a credential if policy requires it.
        // For now, we just proceed.

        // Stub execution - we don't actually call network.
        // We simulate a successful tool call if we got this far.
        result = { status: 'executed', server: serverId, tool: request.tool };

        // Compute output hash
        const outputBuffer = cbor.encodeCanonical(result);
        outputsHash = createHash('sha256').update(outputBuffer).digest('hex');

      } catch (e: any) {
        error = e.message || 'Execution failed';
      }
    } else {
       // If server not found but allowed, it's still an error
       if (!serverId && policyDecision.allowed) {
         error = 'Capability not found';
       } else {
         error = policyDecision.reasons.join(', ') || 'Access Denied';
       }
    }

    // 5. Emit Receipt
    // In a real system we would sign this and append to a ledger.
    // Here we just construct the object.
    const receiptData = {
        ...receiptBase,
        decision: policyDecision.decisionId,
        ts: timestamp,
        server: serverId
    };
    const receiptId = createHash('sha256').update(cbor.encodeCanonical(receiptData)).digest('hex');

    const receipt: ControlPlaneReceipt = {
      ...receiptBase,
      receipt_id: receiptId,
      selected_server_id: serverId,
      policy_decision_id: policyDecision.decisionId,
      policy_reasons: policyDecision.reasons,
      obligations: policyDecision.obligations,
      credential_grant_id: credentialGrantId,
      outputs_hash: outputsHash
    };

    if (policyDecision.allowed && !error) {
      return { success: true, receipt, result };
    } else {
      return { success: false, receipt, error: error || 'Unknown error' };
    }
  }
}
