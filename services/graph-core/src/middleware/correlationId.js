"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationId = correlationId;
const uuid_1 = require("uuid");
function correlationId(req, res, next) {
    const id = req.headers['x-correlation-id'] || (0, uuid_1.v4)();
    req.correlationId = id;
    res.setHeader('X-Correlation-Id', String(id));
    next();
}
