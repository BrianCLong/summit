"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.segmentService = exports.SegmentService = void 0;
const index_js_1 = require("../db/index.js");
const logger_js_1 = require("../utils/logger.js");
const log = logger_js_1.logger.child({ module: 'SegmentService' });
class SegmentService {
    /**
     * Create a new segment.
     */
    async createSegment(input, auditContext) {
        // Validate rules structure
        this.validateRules(input.rules);
        const segment = await index_js_1.segmentRepository.create(input, auditContext.userId);
        await index_js_1.auditRepository.log('segment', segment.id, 'create', auditContext, undefined, { name: segment.name, rulesCount: segment.rules.length });
        log.info({ name: segment.name, id: segment.id }, 'Segment created');
        return segment;
    }
    /**
     * Update a segment.
     */
    async updateSegment(id, input, auditContext) {
        if (input.rules) {
            this.validateRules(input.rules);
        }
        const existing = await index_js_1.segmentRepository.findById(id);
        if (!existing)
            return null;
        const updated = await index_js_1.segmentRepository.update(id, input, auditContext.userId);
        if (!updated)
            return null;
        await index_js_1.auditRepository.log('segment', id, 'update', auditContext, { rulesCount: existing.rules.length }, { rulesCount: updated.rules.length });
        log.info({ name: updated.name, id }, 'Segment updated');
        return updated;
    }
    /**
     * Delete a segment.
     */
    async deleteSegment(id, auditContext) {
        const existing = await index_js_1.segmentRepository.findById(id);
        if (!existing)
            return false;
        const deleted = await index_js_1.segmentRepository.delete(id);
        if (deleted) {
            await index_js_1.auditRepository.log('segment', id, 'delete', auditContext, { name: existing.name }, undefined);
            log.info({ name: existing.name, id }, 'Segment deleted');
        }
        return deleted;
    }
    /**
     * Get a segment by ID.
     */
    async getSegment(id) {
        return index_js_1.segmentRepository.findById(id);
    }
    /**
     * Get a segment by name.
     */
    async getSegmentByName(name, tenantId) {
        return index_js_1.segmentRepository.findByName(name, tenantId);
    }
    /**
     * List segments for a tenant.
     */
    async listSegments(tenantId, options) {
        return index_js_1.segmentRepository.listByTenant(tenantId, options);
    }
    /**
     * Find segments accessible to a tenant.
     */
    async findAccessibleSegments(tenantId) {
        return index_js_1.segmentRepository.findAccessible(tenantId);
    }
    /**
     * Validate segment rules structure.
     */
    validateRules(rules) {
        for (const rule of rules) {
            if (!rule.conditions || rule.conditions.length === 0) {
                throw new Error('Each rule must have at least one condition');
            }
            for (const condition of rule.conditions) {
                if (!condition.attribute || condition.attribute.trim() === '') {
                    throw new Error('Condition attribute is required');
                }
                if (!condition.operator) {
                    throw new Error('Condition operator is required');
                }
            }
        }
    }
}
exports.SegmentService = SegmentService;
exports.segmentService = new SegmentService();
