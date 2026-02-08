import { ToolCallRequest, PolicyDecision, CredentialGrant } from './types.js';

export interface CredentialBroker {
  bind(request: ToolCallRequest, decision: PolicyDecision): Promise<CredentialGrant | null>;
}

export class DisabledCredentialBroker implements CredentialBroker {
  async bind(request: ToolCallRequest, decision: PolicyDecision): Promise<CredentialGrant | null> {
    // For now, return null as we are stubbed
    return null;
  }
}
