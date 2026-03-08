"use strict";
/**
 * Entity Resolution Service - In-Memory Repository Implementations
 *
 * Simple in-memory implementations for development and testing
 * TODO: Replace with real database implementations for production
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryMergeOperationRepository = exports.InMemoryMatchDecisionRepository = exports.InMemoryEntityRecordRepository = void 0;
/**
 * In-memory entity record repository
 */
class InMemoryEntityRecordRepository {
    records = new Map();
    async findById(id) {
        return this.records.get(id) || null;
    }
    async findByIds(ids) {
        return ids.map((id) => this.records.get(id)).filter(Boolean);
    }
    async save(record) {
        this.records.set(record.id, record);
    }
    async findAll() {
        return Array.from(this.records.values());
    }
    async delete(id) {
        this.records.delete(id);
    }
}
exports.InMemoryEntityRecordRepository = InMemoryEntityRecordRepository;
/**
 * In-memory match decision repository
 */
class InMemoryMatchDecisionRepository {
    decisions = new Map();
    recordIndex = new Map(); // recordId -> decisionIds
    async save(decision) {
        const id = decision.id || `decision-${Date.now()}-${Math.random()}`;
        decision.id = id;
        this.decisions.set(id, decision);
        // Index by both record IDs
        this.addToIndex(decision.recordIdA, id);
        this.addToIndex(decision.recordIdB, id);
    }
    async findById(id) {
        return this.decisions.get(id) || null;
    }
    async findByRecordId(recordId) {
        const decisionIds = this.recordIndex.get(recordId) || [];
        return decisionIds
            .map((id) => this.decisions.get(id))
            .filter(Boolean);
    }
    async findAll() {
        return Array.from(this.decisions.values());
    }
    addToIndex(recordId, decisionId) {
        if (!this.recordIndex.has(recordId)) {
            this.recordIndex.set(recordId, []);
        }
        this.recordIndex.get(recordId).push(decisionId);
    }
}
exports.InMemoryMatchDecisionRepository = InMemoryMatchDecisionRepository;
/**
 * In-memory merge operation repository
 */
class InMemoryMergeOperationRepository {
    operations = new Map();
    recordIndex = new Map(); // recordId -> mergeIds
    async save(operation) {
        this.operations.set(operation.mergeId, operation);
        // Index by both record IDs
        this.addToIndex(operation.primaryId, operation.mergeId);
        this.addToIndex(operation.secondaryId, operation.mergeId);
    }
    async findById(mergeId) {
        return this.operations.get(mergeId) || null;
    }
    async findByRecordId(recordId) {
        const mergeIds = this.recordIndex.get(recordId) || [];
        return mergeIds
            .map((id) => this.operations.get(id))
            .filter(Boolean);
    }
    async findAll() {
        return Array.from(this.operations.values());
    }
    addToIndex(recordId, mergeId) {
        if (!this.recordIndex.has(recordId)) {
            this.recordIndex.set(recordId, []);
        }
        this.recordIndex.get(recordId).push(mergeId);
    }
}
exports.InMemoryMergeOperationRepository = InMemoryMergeOperationRepository;
