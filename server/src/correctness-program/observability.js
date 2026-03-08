"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordTimeline = exports.correlationIdMiddleware = exports.correctnessCorrelationIdHeader = void 0;
const crypto_1 = require("crypto");
exports.correctnessCorrelationIdHeader = 'x-correctness-correlation-id';
const correlationIdMiddleware = (req, res, next) => {
    const existing = req.headers[exports.correctnessCorrelationIdHeader];
    const correlationId = existing || (0, crypto_1.randomUUID)();
    req.headers[exports.correctnessCorrelationIdHeader] = correlationId;
    res.setHeader(exports.correctnessCorrelationIdHeader, correlationId);
    next();
};
exports.correlationIdMiddleware = correlationIdMiddleware;
class RecordTimeline {
    entries = [];
    record(entry) {
        this.entries.push(entry);
    }
    forEntity(domain, entityId) {
        return this.entries.filter((entry) => entry.domain === domain && entry.entityId === entityId);
    }
}
exports.RecordTimeline = RecordTimeline;
