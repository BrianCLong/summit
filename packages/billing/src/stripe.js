"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripe = void 0;
exports.createCheckout = createCheckout;
const stripe_1 = __importDefault(require("stripe"));
exports.stripe = new stripe_1.default(process.env.STRIPE_SECRET || '', {
    apiVersion: '2024-04-10',
});
async function createCheckout(tenantId, plan) {
    return exports.stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [
            {
                price: plan === 'pro' ? (process.env.STRIPE_PRICE_PRO || 'price_pro') : (process.env.STRIPE_PRICE_ENT || 'price_ent'),
                quantity: 1,
            },
        ],
        metadata: { tenantId, plan },
        subscription_data: {
            metadata: { tenantId, plan },
        },
        success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
    });
}
