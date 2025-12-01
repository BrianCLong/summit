import crypto from 'crypto';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_transfer' | 'wallet';
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  customerId: string;
  metadata: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefundRequest {
  paymentIntentId: string;
  amount?: number;
  reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'other';
}

export interface PaymentProcessorConfig {
  provider: 'stripe' | 'adyen' | 'internal';
  apiKey: string;
  webhookSecret: string;
  testMode: boolean;
}

export class PaymentProcessor {
  private config: PaymentProcessorConfig;
  private intents: Map<string, PaymentIntent> = new Map();

  constructor(config: PaymentProcessorConfig) {
    this.config = config;
  }

  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    customerId: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentIntent> {
    const id = `pi_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const intent: PaymentIntent = {
      id,
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      status: 'pending',
      customerId: params.customerId,
      metadata: params.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.intents.set(id, intent);
    return intent;
  }

  async confirmPayment(intentId: string): Promise<PaymentIntent> {
    const intent = this.intents.get(intentId);
    if (!intent) throw new Error('payment_intent_not_found');

    intent.status = 'processing';
    intent.updatedAt = new Date();

    // Simulate async processing
    setTimeout(() => {
      intent.status = 'succeeded';
      intent.updatedAt = new Date();
    }, 100);

    return intent;
  }

  async cancelPayment(intentId: string): Promise<PaymentIntent> {
    const intent = this.intents.get(intentId);
    if (!intent) throw new Error('payment_intent_not_found');
    if (intent.status === 'succeeded') {
      throw new Error('cannot_cancel_succeeded_payment');
    }

    intent.status = 'cancelled';
    intent.updatedAt = new Date();
    return intent;
  }

  async refund(request: RefundRequest): Promise<{ id: string; status: string }> {
    const intent = this.intents.get(request.paymentIntentId);
    if (!intent) throw new Error('payment_intent_not_found');
    if (intent.status !== 'succeeded') {
      throw new Error('can_only_refund_succeeded_payments');
    }

    const refundAmount = request.amount || intent.amount;
    if (refundAmount > intent.amount) {
      throw new Error('refund_exceeds_payment');
    }

    return {
      id: `re_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
      status: 'succeeded',
    };
  }

  async getPaymentIntent(intentId: string): Promise<PaymentIntent | null> {
    return this.intents.get(intentId) || null;
  }

  async listPaymentIntents(customerId: string): Promise<PaymentIntent[]> {
    return Array.from(this.intents.values()).filter(
      (i) => i.customerId === customerId,
    );
  }
}

export default PaymentProcessor;
