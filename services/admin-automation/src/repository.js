"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryMetricsRepository = exports.InMemoryServiceNeedRepository = exports.InMemoryCitizenProfileRepository = void 0;
const cache_js_1 = require("./cache.js");
/**
 * In-memory implementation with caching for development/testing.
 * Replace with PostgreSQL implementation for production.
 */
class InMemoryCitizenProfileRepository {
    store = new Map();
    cache;
    constructor() {
        this.cache = new cache_js_1.ProfileCache({ maxSize: 500, ttlSeconds: 300 });
    }
    async findById(id) {
        // Check cache first
        const cached = this.cache.get(id);
        if (cached) {
            return cached;
        }
        const profile = this.store.get(id) || null;
        if (profile) {
            this.cache.set(id, profile);
        }
        return profile;
    }
    async findByIdentifier(type, value) {
        for (const profile of this.store.values()) {
            if (type === 'email' && profile.contact.email === value) {
                return profile;
            }
            if (type === 'ssn' && profile.identifiers.ssn === value) {
                return profile;
            }
            if (type === 'phone' && profile.contact.phone === value) {
                return profile;
            }
        }
        return null;
    }
    async save(profile) {
        this.store.set(profile.id, profile);
        this.cache.set(profile.id, profile);
        return profile;
    }
    async delete(id) {
        this.cache.delete(id);
        return this.store.delete(id);
    }
    async findAll(options) {
        const profiles = Array.from(this.store.values());
        const offset = options?.offset || 0;
        const limit = options?.limit || profiles.length;
        return profiles.slice(offset, offset + limit);
    }
}
exports.InMemoryCitizenProfileRepository = InMemoryCitizenProfileRepository;
class InMemoryServiceNeedRepository {
    store = new Map();
    async findById(id) {
        return this.store.get(id) || null;
    }
    async findByCitizenId(citizenId) {
        return Array.from(this.store.values()).filter(n => n.citizenId === citizenId);
    }
    async save(need) {
        this.store.set(need.id, need);
        return need;
    }
    async updateStatus(id, status) {
        const need = this.store.get(id);
        if (need) {
            need.status = status;
            this.store.set(id, need);
        }
    }
    async delete(id) {
        return this.store.delete(id);
    }
}
exports.InMemoryServiceNeedRepository = InMemoryServiceNeedRepository;
class InMemoryMetricsRepository {
    store = new Map();
    async save(metrics) {
        this.store.set(metrics.period, metrics);
    }
    async findByPeriod(period) {
        return this.store.get(period) || null;
    }
    async findByDateRange(start, end) {
        return Array.from(this.store.values()).filter(m => m.period >= start && m.period <= end);
    }
}
exports.InMemoryMetricsRepository = InMemoryMetricsRepository;
