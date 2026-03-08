"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequestId = exports.bindRequestContext = void 0;
const crypto_1 = require("crypto");
const cls_hooked_1 = require("cls-hooked");
const namespace = (0, cls_hooked_1.createNamespace)('request');
const bindRequestContext = (req, _res, next) => {
    const requestId = req.headers['x-request-id']?.toString() || (0, crypto_1.randomUUID)();
    namespace.run(() => {
        namespace.set('requestId', requestId);
        next();
    });
};
exports.bindRequestContext = bindRequestContext;
const getRequestId = () => namespace.get('requestId');
exports.getRequestId = getRequestId;
