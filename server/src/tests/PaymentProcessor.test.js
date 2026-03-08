"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PaymentProcessor_js_1 = require("../payments/PaymentProcessor.js");
(0, globals_1.describe)('PaymentProcessor', () => {
    let processor;
    (0, globals_1.beforeEach)(() => {
        processor = new PaymentProcessor_js_1.PaymentProcessor({
            provider: 'stripe',
            apiKey: 'test_key',
            webhookSecret: 'test_secret',
            testMode: true,
        });
    });
    (0, globals_1.describe)('createPaymentIntent', () => {
        (0, globals_1.it)('should create a payment intent with correct data', async () => {
            const intent = await processor.createPaymentIntent({
                amount: 1000,
                currency: 'USD',
                customerId: 'cust_123',
                metadata: { orderId: 'order_456' },
            });
            (0, globals_1.expect)(intent.id).toMatch(/^pi_/);
            (0, globals_1.expect)(intent.amount).toBe(1000);
            (0, globals_1.expect)(intent.currency).toBe('usd');
            (0, globals_1.expect)(intent.status).toBe('pending');
            (0, globals_1.expect)(intent.customerId).toBe('cust_123');
        });
    });
    (0, globals_1.describe)('confirmPayment', () => {
        (0, globals_1.it)('should confirm a pending payment', async () => {
            const intent = await processor.createPaymentIntent({
                amount: 500,
                currency: 'eur',
                customerId: 'cust_789',
            });
            const confirmed = await processor.confirmPayment(intent.id);
            (0, globals_1.expect)(confirmed.status).toBe('processing');
        });
        (0, globals_1.it)('should throw for non-existent intent', async () => {
            await (0, globals_1.expect)(processor.confirmPayment('pi_invalid')).rejects.toThrow('payment_intent_not_found');
        });
    });
    (0, globals_1.describe)('cancelPayment', () => {
        (0, globals_1.it)('should cancel a pending payment', async () => {
            const intent = await processor.createPaymentIntent({
                amount: 200,
                currency: 'usd',
                customerId: 'cust_abc',
            });
            const cancelled = await processor.cancelPayment(intent.id);
            (0, globals_1.expect)(cancelled.status).toBe('cancelled');
        });
    });
    (0, globals_1.describe)('listPaymentIntents', () => {
        (0, globals_1.it)('should list intents for a customer', async () => {
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
            (0, globals_1.expect)(intents).toHaveLength(2);
        });
    });
});
