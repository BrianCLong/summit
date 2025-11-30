import { BaseReceiver, DeliveryResult, ReceiverConfig } from './ReceiverInterface.js';
import { CanonicalEvent } from '../events/EventSchema.js';
import { RenderedTemplate } from '../templates/TemplateRenderer.js';

export interface PushReceiverConfig extends ReceiverConfig {
  provider: 'fcm' | 'apns' | 'mock';
  credentials?: Record<string, unknown>;
  defaultTtlSeconds?: number;
}

export class PushReceiver extends BaseReceiver {
  private pushConfig: PushReceiverConfig;

  constructor() {
    super('push', 'Push Notifications');
  }

  protected async onInitialize(): Promise<void> {
    this.pushConfig = this.config as PushReceiverConfig;
  }

  protected async deliverToRecipient(
    event: CanonicalEvent,
    recipient: string,
    options?: Record<string, unknown>,
  ): Promise<DeliveryResult> {
    const template = options?.template as RenderedTemplate | undefined;
    const payload = this.buildPayload(event, template);

    const messageId = await this.retryWithBackoff(async () => {
      return this.sendPush(recipient, payload);
    }, 'push:send');

    return {
      success: true,
      recipientId: recipient,
      channel: this.id,
      messageId,
      deliveredAt: new Date(),
      metadata: { provider: this.pushConfig.provider },
    };
  }

  async validateRecipient(recipient: string): Promise<boolean> {
    return typeof recipient === 'string' && recipient.length > 10;
  }

  protected async performHealthCheck(): Promise<boolean> {
    return true;
  }

  protected async onShutdown(): Promise<void> {
    return;
  }

  private async sendPush(
    recipient: string,
    payload: Record<string, unknown>,
  ): Promise<string> {
    await this.sleep(5);
    return `${this.pushConfig.provider || 'mock'}_${Date.now()}_${recipient}`;
  }

  private buildPayload(
    event: CanonicalEvent,
    template?: RenderedTemplate,
  ): Record<string, unknown> {
    return {
      title: template?.subject || event.title,
      body: template?.shortMessage || event.message,
      severity: event.severity,
      type: event.type,
      eventId: event.id,
      timestamp: event.timestamp,
      ttlSeconds: this.pushConfig.defaultTtlSeconds || 3600,
      action: template?.callToAction || event.subject.url,
    };
  }
}
