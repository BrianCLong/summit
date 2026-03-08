"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryMemoryBroker = void 0;
const policy_1 = require("./policy");
const crypto_1 = require("crypto");
class InMemoryMemoryBroker {
    records = [];
    async remember(recordData) {
        const decision = (0, policy_1.canWrite)(recordData);
        if (!decision.allow) {
            throw new Error(`Write denied: ${decision.reason}`);
        }
        const record = {
            ...recordData,
            id: (0, crypto_1.randomUUID)(),
            createdAt: Date.now(),
        };
        this.records.push(record);
        return record;
    }
    async recall(scope) {
        return this.records.filter((record) => {
            const decision = (0, policy_1.canRead)(scope, record);
            return decision.allow;
        });
    }
    async update(id, updates) {
        const index = this.records.findIndex((r) => r.id === id);
        if (index === -1) {
            throw new Error(`Record ${id} not found`);
        }
        const updatedRecord = {
            ...this.records[index],
            ...updates,
            id: this.records[index].id, // Ensure ID doesn't change
            userId: this.records[index].userId, // Ensure userId doesn't change via update
        };
        this.records[index] = updatedRecord;
        return updatedRecord;
    }
    async forget(id) {
        const index = this.records.findIndex((r) => r.id === id);
        if (index !== -1) {
            this.records.splice(index, 1);
        }
    }
    async export(userId, contextSpace) {
        const userRecords = this.records.filter((r) => r.userId === userId && r.contextSpace === contextSpace);
        return JSON.stringify(userRecords); // In real impl, this would be encrypted
    }
    // Helper for tests to see all records regardless of policy
    __getAllRecords() {
        return [...this.records];
    }
}
exports.InMemoryMemoryBroker = InMemoryMemoryBroker;
