"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_2 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const router = (0, express_1.Router)();
const stripe = new stripe_1.default(process.env.STRIPE_API_KEY || '', {
    apiVersion: '2024-06-20',
});
router.post('/events', express_2.default.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
    const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
    if (!secret)
        return res.status(503).send('webhook disabled');
    try {
        const sig = req.header('Stripe-Signature') || '';
        const event = stripe.webhooks.constructEvent(req.body, sig, secret);
        // handle event.type...
        return res.sendStatus(200);
    }
    catch {
        return res.status(400).send('bad signature');
    }
});
exports.default = router;
