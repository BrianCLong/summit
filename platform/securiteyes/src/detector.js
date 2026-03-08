"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetectionEngine = void 0;
const crypto_1 = require("crypto");
class DetectionEngine {
    run(input) {
        const events = [];
        // Rule 1: Excessive login failures
        if (input.eventType === 'LOGIN_FAILURE' && (input.count || 0) > 5) {
            events.push({
                id: (0, crypto_1.randomUUID)(),
                type: 'EXCESSIVE_LOGIN_FAILURES',
                severity: 'MEDIUM',
                timestamp: new Date(),
                source: input.ip || 'unknown',
                details: { count: input.count }
            });
        }
        // Rule 2: Unusual IP / Geo mismatch (Mocked logic)
        if (input.ip && input.ip.startsWith('192.168.99.')) { // Mock suspicious subnet
            events.push({
                id: (0, crypto_1.randomUUID)(),
                type: 'UNUSUAL_IP_SUBNET',
                severity: 'LOW',
                timestamp: new Date(),
                source: input.ip,
                details: { reason: 'Restricted subnet access attempt' }
            });
        }
        // Rule 3: High-frequency task creation
        if (input.eventType === 'TASK_CREATION' && (input.count || 0) > 20) {
            events.push({
                id: (0, crypto_1.randomUUID)(),
                type: 'HIGH_VELOCITY_TASK_CREATION',
                severity: 'HIGH',
                timestamp: new Date(),
                source: input.userId || 'system',
                details: { rate: '20+ per minute' }
            });
        }
        return events;
    }
}
exports.DetectionEngine = DetectionEngine;
