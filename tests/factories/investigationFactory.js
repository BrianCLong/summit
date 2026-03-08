"use strict";
/**
 * Investigation Factory
 *
 * Generates test investigation data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.investigationFactory = investigationFactory;
exports.investigationFactoryBatch = investigationFactoryBatch;
exports.criticalInvestigationFactory = criticalInvestigationFactory;
const crypto_1 = require("crypto");
/**
 * Create a test investigation with optional overrides
 */
function investigationFactory(options = {}) {
    const id = options.id || (0, crypto_1.randomUUID)();
    const now = new Date();
    return {
        id,
        title: options.title || `Test Investigation ${id.slice(0, 8)}`,
        description: options.description || 'This is a test investigation',
        status: options.status || 'open',
        priority: options.priority || 'medium',
        assigneeId: options.assigneeId !== undefined ? options.assigneeId : null,
        creatorId: options.creatorId || (0, crypto_1.randomUUID)(),
        tags: options.tags || ['test', 'investigation'],
        metadata: options.metadata || {},
        createdAt: options.createdAt || now,
        updatedAt: options.updatedAt || now,
    };
}
/**
 * Create multiple test investigations
 */
function investigationFactoryBatch(count, options = {}) {
    return Array.from({ length: count }, () => investigationFactory(options));
}
/**
 * Create a high-priority investigation
 */
function criticalInvestigationFactory(options = {}) {
    return investigationFactory({ ...options, priority: 'critical', status: 'in_progress' });
}
