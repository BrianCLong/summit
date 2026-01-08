import crypto from "node:crypto";

export class IntegrationService {
  constructor() {
    this.integrations = new Map();
    this.replayBuffer = new Map();
  }

  inventory(tenantId, integrations) {
    this.integrations.set(tenantId, integrations);
  }

  dualPublish(tenantId, event) {
    const buffer = this.replayBuffer.get(tenantId) ?? [];
    buffer.push(event);
    this.replayBuffer.set(tenantId, buffer.slice(-1000));
  }

  replayMissed(tenantId, sinceId) {
    const events = this.replayBuffer.get(tenantId) ?? [];
    if (!sinceId) return events;
    const idx = events.findIndex((e) => e.id === sinceId);
    return idx === -1 ? events : events.slice(idx + 1);
  }

  signWebhook(payload, secret) {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  verifyWebhook(payload, secret, signature) {
    const expected = this.signWebhook(payload, secret);
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  }

  healthSummary(tenantId) {
    const integrations = this.integrations.get(tenantId) ?? [];
    return integrations.reduce((acc, integration) => {
      acc[integration.id] = integration.health ?? "healthy";
      return acc;
    }, {});
  }
}
