"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryJobStore = void 0;
const crypto_1 = require("crypto");
class InMemoryJobStore {
    jobs = new Map();
    async create(type, data) {
        const id = (0, crypto_1.randomUUID)();
        const job = { id, type, data, status: "pending", createdAt: Date.now(), updatedAt: Date.now() };
        this.jobs.set(id, job);
        return job;
    }
    async get(id) { return this.jobs.get(id) || null; }
    async update(id, update) {
        const job = this.jobs.get(id);
        if (!job)
            throw new Error(`Job ${id} not found`);
        const updated = { ...job, ...update, updatedAt: Date.now() };
        this.jobs.set(id, updated);
        return updated;
    }
    async list(status) {
        const jobs = Array.from(this.jobs.values());
        if (status)
            return jobs.filter((j) => j.status === status);
        return jobs;
    }
}
exports.InMemoryJobStore = InMemoryJobStore;
