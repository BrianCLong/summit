"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationIdHeader = void 0;
exports.correlationIdMiddleware = correlationIdMiddleware;
const node_crypto_1 = require("node:crypto");
exports.correlationIdHeader = 'x-correlation-id';
function correlationIdMiddleware() {
    return (req, res, next) => {
        const augmentedReq = req;
        const locals = res.locals;
        const headerValue = req.header(exports.correlationIdHeader);
        const correlationId = headerValue?.trim() || (0, node_crypto_1.randomUUID)();
        augmentedReq.correlationId = correlationId;
        locals.correlationId = correlationId;
        res.setHeader('X-Correlation-Id', correlationId);
        if (!augmentedReq.aiContext) {
            augmentedReq.aiContext = {};
        }
        augmentedReq.aiContext.correlationId = correlationId;
        next();
    };
}
