"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestId = requestId;
const crypto_1 = require("crypto");
function requestId(headerName = 'x-request-id') {
    return (req, res, next) => {
        const headerValue = req.headers[headerName];
        const existingRequestId = Array.isArray(headerValue)
            ? headerValue[0]
            : headerValue;
        const reqId = existingRequestId || (0, crypto_1.randomUUID)();
        req.reqId = reqId;
        res.setHeader(headerName, reqId);
        next();
    };
}
