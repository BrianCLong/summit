import { WebhookEndpoint } from './types.js';

export interface WebhookDelivery {
  endpoint: WebhookEndpoint;
  payload: Record<string, unknown>;
}

export class WebhookRegistry {
  private readonly endpoints: WebhookEndpoint[] = [];

  register(endpoint: WebhookEndpoint): void {
    const existing = this.endpoints.find((entry) => entry.producerId === endpoint.producerId);
    if (existing) {
      existing.url = endpoint.url;
      existing.secret = endpoint.secret;
      existing.enabled = endpoint.enabled;
      return;
    }
    this.endpoints.push(endpoint);
  }

  activeForProducer(producerId: string): WebhookEndpoint[] {
    return this.endpoints.filter((endpoint) => endpoint.producerId === producerId && endpoint.enabled);
  }

  buildNotifications(producerId: string, payload: Record<string, unknown>): WebhookDelivery[] {
    return this.activeForProducer(producerId).map((endpoint) => ({ endpoint, payload }));
  }
}
