"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GENESIS_HASH = void 0;
exports.calculateEventHash = calculateEventHash;
exports.calculateChainHash = calculateChainHash;
const crypto_1 = require("crypto");
exports.GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
function calculateEventHash(event) {
    const hashableData = {
        id: event.id,
        eventType: event.eventType,
        level: event.level,
        timestamp: event.timestamp instanceof Date
            ? event.timestamp.toISOString()
            : event.timestamp,
        correlationId: event.correlationId,
        tenantId: event.tenantId,
        serviceId: event.serviceId,
        serviceName: event.serviceName,
        environment: event.environment,
        userId: event.userId,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        action: event.action,
        outcome: event.outcome,
        message: event.message,
        details: event.details,
        complianceRelevant: event.complianceRelevant,
        complianceFrameworks: event.complianceFrameworks,
    };
    const sortedJson = JSON.stringify(hashableData, Object.keys(hashableData).sort());
    return (0, crypto_1.createHash)('sha256').update(sortedJson).digest('hex');
}
function calculateChainHash(eventHash, previousHash, sequence) {
    const data = `${eventHash}:${previousHash}:${sequence.toString()}`;
    return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
}
