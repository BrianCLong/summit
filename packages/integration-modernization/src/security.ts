import { createHmac } from 'crypto';

export type EgressPolicy = {
  allowedHosts: string[];
};

export type RateLimitWindow = {
  tenantId: string;
  limit: number;
  windowMs: number;
};

export class SecurityControls {
  private egressPolicy: EgressPolicy;
  private approvals: Set<string> = new Set();
  private killSwitches: Set<string> = new Set();
  private rateLimits: RateLimitWindow[];
  private hits: Map<string, number[]> = new Map();

  constructor(policy: EgressPolicy, rateLimits: RateLimitWindow[]) {
    this.egressPolicy = policy;
    this.rateLimits = rateLimits;
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string) {
    const computed = createHmac('sha256', secret).update(payload).digest('hex');
    return computed === signature;
  }

  assertEgress(url: string) {
    const host = new URL(url).host;
    if (!this.egressPolicy.allowedHosts.includes(host)) {
      throw new Error(`Egress host ${host} not allowed`);
    }
  }

  requireApproval(connectorId: string) {
    if (!this.approvals.has(connectorId)) {
      throw new Error(`Connector ${connectorId} requires two-person approval`);
    }
  }

  approve(connectorId: string) {
    this.approvals.add(connectorId);
  }

  enableKillSwitch(connectorId: string) {
    this.killSwitches.add(connectorId);
  }

  isDisabled(connectorId: string) {
    return this.killSwitches.has(connectorId);
  }

  enforceRateLimit(tenantId: string) {
    const window = this.rateLimits.find((limit) => limit.tenantId === tenantId);
    if (!window) return;
    const now = Date.now();
    const history = this.hits.get(tenantId) ?? [];
    const windowStart = now - window.windowMs;
    const filtered = history.filter((timestamp) => timestamp >= windowStart);
    if (filtered.length >= window.limit) {
      throw new Error('Rate limit exceeded');
    }
    filtered.push(now);
    this.hits.set(tenantId, filtered);
  }
}
