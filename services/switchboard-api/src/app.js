"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const webhooks_js_1 = require("./routes/webhooks.js");
async function buildApp() {
    const fastify = (0, fastify_1.default)({
        logger: false
    });
    await fastify.register(helmet_1.default);
    await fastify.register(cors_1.default);
    // Register routes
    await fastify.register(webhooks_js_1.webhookRoutes, { prefix: '/webhooks' });
    fastify.get('/healthz', async () => {
        return { status: 'ok' };
    });
    return fastify;
}
