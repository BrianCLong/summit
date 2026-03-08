"use strict";
/**
 * Audit Service Integration
 *
 * Integrates with the platform's existing audit-log service for
 * enterprise-grade immutable audit trails.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryAuditClient = exports.HttpAuditClient = void 0;
exports.createAuditEvent = createAuditEvent;
const crypto_1 = __importDefault(require("crypto"));
/**
 * HTTP client for external audit-log service
 */
class HttpAuditClient {
    baseUrl;
    apiKey;
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.apiKey = apiKey;
    }
    async append(event) {
        const response = await fetch(`${this.baseUrl}/audit/append`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
            },
            body: JSON.stringify(event),
        });
        if (!response.ok) {
            throw new Error(`Audit append failed: ${response.status}`);
        }
    }
    async query(filters) {
        const params = new URLSearchParams();
        if (filters.eventType) {
            params.set('eventType', filters.eventType);
        }
        if (filters.actorId) {
            params.set('actorId', filters.actorId);
        }
        if (filters.resourceType) {
            params.set('resourceType', filters.resourceType);
        }
        if (filters.resourceId) {
            params.set('resourceId', filters.resourceId);
        }
        if (filters.startTime) {
            params.set('startTime', filters.startTime.toISOString());
        }
        if (filters.endTime) {
            params.set('endTime', filters.endTime.toISOString());
        }
        if (filters.limit) {
            params.set('limit', String(filters.limit));
        }
        const response = await fetch(`${this.baseUrl}/audit/query?${params}`, {
            headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        });
        if (!response.ok) {
            throw new Error(`Audit query failed: ${response.status}`);
        }
        return response.json();
    }
    async verifyIntegrity() {
        const response = await fetch(`${this.baseUrl}/audit/verify`, {
            headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        });
        if (!response.ok) {
            throw new Error(`Audit verify failed: ${response.status}`);
        }
        return response.json();
    }
}
exports.HttpAuditClient = HttpAuditClient;
/**
 * In-memory audit client for standalone operation or testing
 */
class InMemoryAuditClient {
    events = [];
    async append(event) {
        // Verify hash chain
        if (this.events.length > 0) {
            const lastEvent = this.events[this.events.length - 1];
            if (event.previousHash !== lastEvent.currentHash) {
                throw new Error('Hash chain broken');
            }
        }
        this.events.push(event);
    }
    async query(filters) {
        let results = [...this.events];
        if (filters.eventType) {
            results = results.filter((e) => e.eventType === filters.eventType);
        }
        if (filters.actorId) {
            results = results.filter((e) => e.actorId === filters.actorId);
        }
        if (filters.resourceType) {
            results = results.filter((e) => e.resourceType === filters.resourceType);
        }
        if (filters.resourceId) {
            results = results.filter((e) => e.resourceId === filters.resourceId);
        }
        if (filters.startTime) {
            results = results.filter((e) => new Date(e.timestamp) >= filters.startTime);
        }
        if (filters.endTime) {
            results = results.filter((e) => new Date(e.timestamp) <= filters.endTime);
        }
        return results.slice(0, filters.limit ?? 100);
    }
    async verifyIntegrity() {
        for (let i = 1; i < this.events.length; i++) {
            if (this.events[i].previousHash !== this.events[i - 1].currentHash) {
                return { valid: false, chainLength: this.events.length };
            }
        }
        return { valid: true, chainLength: this.events.length };
    }
    getEvents() {
        return [...this.events];
    }
}
exports.InMemoryAuditClient = InMemoryAuditClient;
/**
 * Create audit event with hash chain
 */
function createAuditEvent(data, previousHash = '0'.repeat(64)) {
    const eventId = crypto_1.default.randomUUID();
    const timestamp = new Date().toISOString();
    const eventData = {
        ...data,
        eventId,
        timestamp,
        previousHash,
    };
    const currentHash = crypto_1.default
        .createHash('sha256')
        .update(JSON.stringify(eventData))
        .digest('hex');
    return {
        ...eventData,
        currentHash,
    };
}
