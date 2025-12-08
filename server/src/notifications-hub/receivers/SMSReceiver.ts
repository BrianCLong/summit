
import { BaseReceiver, DeliveryResult } from './ReceiverInterface.js';
import { CanonicalEvent } from '../events/EventSchema.js';

/**
 * SMS Receiver implementation for sending text messages.
 * Uses a provider (e.g. Twilio, AWS SNS) via a pluggable adapter pattern or direct config.
 * For this MVP, we will simulate the sending logic.
 */
export class SMSReceiver extends BaseReceiver {
  constructor() {
    super('sms', 'SMS Receiver');
  }

  protected async onInitialize(): Promise<void> {
    // Initialize SMS provider client here (e.g. Twilio)
    // const { accountSid, authToken } = this.config.metadata;
    console.log('SMS Receiver initialized');
  }

  protected async deliverToRecipient(
    event: CanonicalEvent,
    recipient: string,
    options?: Record<string, unknown>
  ): Promise<DeliveryResult> {

    // Simulate SMS sending
    // In a real implementation: await this.twilioClient.messages.create(...)

    // Simulate latency
    await this.sleep(100);

    const success = true; // Assume success for mock

    if (success) {
      console.log(`[SMS] Sent to ${recipient}: ${event.title}`);
      return {
        success: true,
        recipientId: recipient,
        channel: this.id,
        messageId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        deliveredAt: new Date(),
      };
    } else {
        return {
            success: false,
            recipientId: recipient,
            channel: this.id,
            error: new Error('Failed to send SMS'),
        }
    }
  }

  async validateRecipient(recipient: string): Promise<boolean> {
    // Basic phone number validation (E.164 format check)
    return /^\+?[1-9]\d{1,14}$/.test(recipient);
  }

  protected async performHealthCheck(): Promise<boolean> {
    // Check connection to SMS provider
    return true;
  }

  protected async onShutdown(): Promise<void> {
    // Close connections
  }
}
