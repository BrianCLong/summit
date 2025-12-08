import { BaseReceiver, DeliveryResult, ReceiverConfig } from './ReceiverInterface.js';
import { CanonicalEvent } from '../events/EventSchema.js';
import { RenderedTemplate } from '../templates/TemplateRenderer.js';

export interface SmsReceiverConfig extends ReceiverConfig {
  provider: 'twilio' | 'sns' | 'mock';
  senderId: string;
  credentials?: Record<string, unknown>;
  maxLength?: number;
}

export class SmsReceiver extends BaseReceiver {
  private smsConfig: SmsReceiverConfig;

  constructor() {
    super('sms', 'SMS Notifications');
  }

  protected async onInitialize(): Promise<void> {
    this.smsConfig = this.config as SmsReceiverConfig;
    if (!this.smsConfig.senderId) {
      throw new Error('SMS receiver requires senderId');
    }
  }

  protected async deliverToRecipient(
    event: CanonicalEvent,
    recipient: string,
    options?: Record<string, unknown>,
  ): Promise<DeliveryResult> {
    const template = options?.template as RenderedTemplate | undefined;
    const content = this.buildMessageContent(event, template);

    const messageId = await this.retryWithBackoff(async () => {
      return this.sendSms(recipient, content);
    }, 'sms:send');

    return {
      success: true,
      recipientId: recipient,
      channel: this.id,
      messageId,
      deliveredAt: new Date(),
      metadata: { provider: this.smsConfig.provider },
    };
  }

  async validateRecipient(recipient: string): Promise<boolean> {
    return /^\+?[1-9]\d{7,14}$/.test(recipient);
  }

  protected async performHealthCheck(): Promise<boolean> {
    return true;
  }

  protected async onShutdown(): Promise<void> {
    return;
  }

  private async sendSms(recipient: string, message: string): Promise<string> {
    // Placeholder for provider SDK integration
    await this.sleep(5);
    return `${this.smsConfig.provider || 'mock'}_${Date.now()}_${recipient}`;
  }

  private buildMessageContent(
    event: CanonicalEvent,
    template?: RenderedTemplate,
  ): string {
    const base = template?.shortMessage || `${event.title}: ${event.message}`;
    const maxLength = this.smsConfig.maxLength || 320;
    return base.length > maxLength ? `${base.slice(0, maxLength - 3)}...` : base;
  }
}
