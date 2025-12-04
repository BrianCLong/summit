import { PaymentProcessor } from '../payments/PaymentProcessor';

describe('PaymentProcessor', () => {
  let processor: PaymentProcessor;

  beforeEach(() => {
    processor = new PaymentProcessor({
      provider: 'stripe',
      apiKey: 'test_key',
      webhookSecret: 'test_secret',
      testMode: true,
    });
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent with correct data', async () => {
      const intent = await processor.createPaymentIntent({
        amount: 1000,
        currency: 'USD',
        customerId: 'cust_123',
        metadata: { orderId: 'order_456' },
      });

      expect(intent.id).toMatch(/^pi_/);
      expect(intent.amount).toBe(1000);
      expect(intent.currency).toBe('usd');
      expect(intent.status).toBe('pending');
      expect(intent.customerId).toBe('cust_123');
    });
  });

  describe('confirmPayment', () => {
    it('should confirm a pending payment', async () => {
      const intent = await processor.createPaymentIntent({
        amount: 500,
        currency: 'eur',
        customerId: 'cust_789',
      });

      const confirmed = await processor.confirmPayment(intent.id);
      expect(confirmed.status).toBe('processing');
    });

    it('should throw for non-existent intent', async () => {
      await expect(processor.confirmPayment('pi_invalid')).rejects.toThrow(
        'payment_intent_not_found',
      );
    });
  });

  describe('cancelPayment', () => {
    it('should cancel a pending payment', async () => {
      const intent = await processor.createPaymentIntent({
        amount: 200,
        currency: 'usd',
        customerId: 'cust_abc',
      });

      const cancelled = await processor.cancelPayment(intent.id);
      expect(cancelled.status).toBe('cancelled');
    });
  });

  describe('listPaymentIntents', () => {
    it('should list intents for a customer', async () => {
      const customerId = 'cust_list_test';
      await processor.createPaymentIntent({
        amount: 100,
        currency: 'usd',
        customerId,
      });
      await processor.createPaymentIntent({
        amount: 200,
        currency: 'usd',
        customerId,
      });

      const intents = await processor.listPaymentIntents(customerId);
      expect(intents).toHaveLength(2);
    });
  });
});
