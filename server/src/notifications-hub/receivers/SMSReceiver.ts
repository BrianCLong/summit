/**
 * SMS Receiver for sending SMS notifications
 *
 * Minimal implementation to support NotificationHub wiring.
 */

import {
  BaseReceiver,
  DeliveryResult,
  ReceiverConfig,
} from './ReceiverInterface.js';
import { CanonicalEvent } from '../events/EventSchema.js';

export interface SMSReceiverConfig extends ReceiverConfig {
  fromNumber?: string;
}

export class SMSReceiver extends BaseReceiver {
  private smsConfig!: SMSReceiverConfig;

  constructor() {
    super('sms', 'SMS Notifications');
  }

  protected async onInitialize(): Promise<void> {
    this.smsConfig = this.config as SMSReceiverConfig;
  }

  protected async deliverToRecipient(
    _event: CanonicalEvent,
    recipient: string,
  ): Promise<DeliveryResult> {
    return {
      success: true,
      recipientId: recipient,
      channel: this.id,
      messageId: `sms_${Date.now()}`,
      deliveredAt: new Date(),
    };
  }

  async validateRecipient(recipient: string): Promise<boolean> {
    return Boolean(recipient);
  }

  protected async performHealthCheck(): Promise<boolean> {
    return true;
  }

  protected async onShutdown(): Promise<void> {
    return;
  }
}
