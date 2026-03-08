"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class WebhookService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async provisionSubscription(input) {
        return this.repository.createSubscription(input);
    }
    generateSignature(payload, secret) {
        const serialized = JSON.stringify(payload);
        return crypto_1.default
            .createHmac('sha256', secret)
            .update(serialized)
            .digest('hex');
    }
    validateSignature(payload, secret, signature) {
        const expected = this.generateSignature(payload, secret);
        const expectedBuffer = Buffer.from(expected, 'hex');
        const receivedBuffer = Buffer.from(signature, 'hex');
        if (expectedBuffer.length !== receivedBuffer.length) {
            return false;
        }
        return crypto_1.default.timingSafeEqual(expectedBuffer, receivedBuffer);
    }
    async queueEventDeliveries(event) {
        const subscriptions = await this.repository.findSubscriptionsForEvent(event.tenantId, event.eventType);
        const deliveries = [];
        for (const subscription of subscriptions) {
            const delivery = await this.repository.createDelivery(subscription.id, event.eventType, event.payload, event.idempotencyKey || crypto_1.default.randomUUID());
            deliveries.push(delivery);
        }
        return deliveries;
    }
}
exports.WebhookService = WebhookService;
