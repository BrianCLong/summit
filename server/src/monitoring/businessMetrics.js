"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordUserSignup = recordUserSignup;
exports.recordApiCall = recordApiCall;
exports.recordRevenue = recordRevenue;
exports.recordBusinessEvent = recordBusinessEvent;
const pino_1 = __importDefault(require("pino"));
const metrics_js_1 = require("./metrics.js");
const logger = pino_1.default({ name: 'business-metrics' });
function normalize(value, fallback) {
    if (!value) {
        return fallback;
    }
    return value.toLowerCase().replace(/[^a-z0-9-_\.]/g, '-');
}
function recordUserSignup(event) {
    const tenant = normalize(event.tenant, 'unknown');
    const plan = normalize(event.plan, 'unspecified');
    metrics_js_1.businessUserSignupsTotal.inc({ tenant, plan });
    logger.debug({ tenant, plan, metadata: event.metadata }, 'Recorded user signup metric');
}
function recordApiCall(event) {
    const tenant = normalize(event.tenant, 'unknown');
    const service = normalize(event.service, 'core');
    const route = event.route ?? 'unknown';
    const statusCode = event.statusCode ?? 200;
    metrics_js_1.businessApiCallsTotal.inc({
        tenant,
        service,
        route,
        status_code: String(statusCode),
    });
    logger.debug({ tenant, service, route, statusCode, metadata: event.metadata }, 'Recorded API call metric');
}
function recordRevenue(event) {
    const tenant = normalize(event.tenant, 'unknown');
    const currency = normalize(event.currency, 'usd').toUpperCase();
    const amount = Number(event.amount ?? 0);
    if (!Number.isFinite(amount) || amount < 0) {
        logger.warn({ tenant, currency, amount }, 'Ignored revenue metric with invalid amount');
        return;
    }
    metrics_js_1.businessRevenueTotal.inc({ tenant, currency }, amount);
    logger.debug({ tenant, currency, amount, metadata: event.metadata }, 'Recorded revenue metric');
}
function recordBusinessEvent(event) {
    switch (event.type) {
        case 'user_signup':
            recordUserSignup(event);
            break;
        case 'api_call':
            recordApiCall(event);
            break;
        case 'revenue':
            recordRevenue(event);
            break;
        default:
            logger.warn({ event }, 'Unsupported business metric event type received');
    }
}
