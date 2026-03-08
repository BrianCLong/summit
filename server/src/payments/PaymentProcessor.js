"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentProcessor = void 0;
const crypto_1 = __importDefault(require("crypto"));
class PaymentProcessor {
    config;
    intents = new Map();
    constructor(config) {
        this.config = config;
    }
    async createPaymentIntent(params) {
        const id = `pi_${crypto_1.default.randomUUID().replace(/-/g, '').slice(0, 24)}`;
        const intent = {
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
    async confirmPayment(intentId) {
        const intent = this.intents.get(intentId);
        if (!intent)
            throw new Error('payment_intent_not_found');
        intent.status = 'processing';
        intent.updatedAt = new Date();
        // Simulate async processing
        setTimeout(() => {
            intent.status = 'succeeded';
            intent.updatedAt = new Date();
        }, 100);
        return intent;
    }
    async cancelPayment(intentId) {
        const intent = this.intents.get(intentId);
        if (!intent)
            throw new Error('payment_intent_not_found');
        if (intent.status === 'succeeded') {
            throw new Error('cannot_cancel_succeeded_payment');
        }
        intent.status = 'cancelled';
        intent.updatedAt = new Date();
        return intent;
    }
    async refund(request) {
        const intent = this.intents.get(request.paymentIntentId);
        if (!intent)
            throw new Error('payment_intent_not_found');
        if (intent.status !== 'succeeded') {
            throw new Error('can_only_refund_succeeded_payments');
        }
        const refundAmount = request.amount || intent.amount;
        if (refundAmount > intent.amount) {
            throw new Error('refund_exceeds_payment');
        }
        return {
            id: `re_${crypto_1.default.randomUUID().replace(/-/g, '').slice(0, 24)}`,
            status: 'succeeded',
        };
    }
    async getPaymentIntent(intentId) {
        return this.intents.get(intentId) || null;
    }
    async listPaymentIntents(customerId) {
        return Array.from(this.intents.values()).filter((i) => i.customerId === customerId);
    }
}
exports.PaymentProcessor = PaymentProcessor;
exports.default = PaymentProcessor;
