"use strict";
/**
 * CompanyOS Tenant API - GraphQL Context
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRequestId = generateRequestId;
exports.getClientIp = getClientIp;
function generateRequestId() {
    return (Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15));
}
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || 'unknown';
}
