"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContext = buildContext;
async function buildContext({ req, }) {
    const headers = req.headers;
    const expressReq = req; // Cast to any to access custom properties
    return {
        tenantId: headers['x-tenant-id'] ?? '',
        caseId: headers['x-case-id'],
        userId: headers['x-user-id'] ?? '',
        legalBasis: headers['x-legal-basis'],
        reason: headers['x-reason'],
        obligations: [],
        traceId: expressReq.context?.traceId, // Get from req.context
        spanId: expressReq.context?.spanId, // Get from req.context
    };
}
