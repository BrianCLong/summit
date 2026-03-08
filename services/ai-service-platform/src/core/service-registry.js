"use strict";
/**
 * Service Registry - Central catalog of all AI services
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceRegistry = void 0;
const uuid_1 = require("uuid");
class ServiceRegistry {
    services = new Map();
    initialized = false;
    async initialize() {
        // In production, load from database
        this.initialized = true;
    }
    async register(definition) {
        const id = definition.id || (0, uuid_1.v4)();
        const now = new Date();
        const service = {
            ...definition,
            id,
            deployments: new Map(),
            createdAt: now,
            updatedAt: now,
        };
        this.services.set(id, service);
        return service;
    }
    async get(id) {
        return this.services.get(id);
    }
    async getByName(name) {
        for (const service of this.services.values()) {
            if (service.name === name) {
                return service;
            }
        }
        return undefined;
    }
    async list(filters) {
        let results = Array.from(this.services.values());
        if (filters?.type) {
            results = results.filter((s) => s.type === filters.type);
        }
        return results;
    }
    async update(id, updates) {
        const service = this.services.get(id);
        if (!service) {
            return undefined;
        }
        const updated = {
            ...service,
            ...updates,
            id,
            updatedAt: new Date(),
        };
        this.services.set(id, updated);
        return updated;
    }
    async delete(id) {
        return this.services.delete(id);
    }
    async addDeployment(serviceId, deployment) {
        const service = this.services.get(serviceId);
        if (service) {
            service.deployments.set(deployment.id, deployment);
        }
    }
    async getDeployments(serviceId) {
        const service = this.services.get(serviceId);
        return service ? Array.from(service.deployments.values()) : [];
    }
    getStats() {
        const byType = {};
        let activeDeployments = 0;
        for (const service of this.services.values()) {
            byType[service.type] = (byType[service.type] || 0) + 1;
            for (const dep of service.deployments.values()) {
                if (dep.status === 'running') {
                    activeDeployments++;
                }
            }
        }
        return {
            totalServices: this.services.size,
            byType,
            activeDeployments,
        };
    }
}
exports.ServiceRegistry = ServiceRegistry;
