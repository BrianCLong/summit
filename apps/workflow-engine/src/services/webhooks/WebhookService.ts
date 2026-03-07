import crypto from "crypto";
import {
  CreateWebhookSubscription,
  WebhookDelivery,
  WebhookEvent,
  WebhookSubscription,
} from "./types";
import { WebhookRepository } from "./WebhookRepository";

export class WebhookService {
  constructor(private readonly repository: WebhookRepository) {}

  async provisionSubscription(input: CreateWebhookSubscription): Promise<WebhookSubscription> {
    return this.repository.createSubscription(input);
  }

  generateSignature(payload: Record<string, unknown>, secret: string): string {
    const serialized = JSON.stringify(payload);
    return crypto.createHmac("sha256", secret).update(serialized).digest("hex");
  }

  validateSignature(payload: Record<string, unknown>, secret: string, signature: string): boolean {
    const expected = this.generateSignature(payload, secret);
    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(signature, "hex");

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  async queueEventDeliveries(event: WebhookEvent): Promise<WebhookDelivery[]> {
    const subscriptions = await this.repository.findSubscriptionsForEvent(
      event.tenantId,
      event.eventType
    );

    const deliveries: WebhookDelivery[] = [];
    for (const subscription of subscriptions) {
      const delivery = await this.repository.createDelivery(
        subscription.id,
        event.eventType,
        event.payload,
        event.idempotencyKey || crypto.randomUUID()
      );
      deliveries.push(delivery);
    }

    return deliveries;
  }
}
