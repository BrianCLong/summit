"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBackbone = void 0;
const crypto_1 = require("crypto");
class EventBackbone {
    schemas = new Map();
    events = [];
    dlq = [];
    processed = new Map();
    options;
    constructor(options) {
        this.options = options;
    }
    registerSchema(schema) {
        const versions = this.schemas.get(schema.name) ?? [];
        const latest = versions.at(-1);
        if (latest) {
            const missingFields = latest.requiredFields.filter((field) => !schema.requiredFields.includes(field));
            if (missingFields.length) {
                throw new Error(`Schema ${schema.name} ${schema.version} incompatible; missing ${missingFields.join(',')}`);
            }
        }
        this.schemas.set(schema.name, [...versions, schema]);
    }
    signPayload(payload) {
        const serialized = JSON.stringify(payload);
        return (0, crypto_1.createHmac)('sha256', this.options.signatureSecret).update(serialized).digest('hex');
    }
    async publish(tenantId, name, payload, idempotencyKey, consumer) {
        const key = `${tenantId}:${idempotencyKey}`;
        const lastProcessed = this.processed.get(key);
        if (lastProcessed && Date.now() - lastProcessed < this.options.baseBackoffMs * this.options.maxAttempts) {
            return 'delivered';
        }
        const eventsByTenant = this.events.filter((event) => event.tenantId === tenantId && event.timestamp > Date.now() - 60000);
        if (eventsByTenant.length >= this.options.quotaPerTenant) {
            throw new Error('Tenant quota exceeded');
        }
        const record = {
            tenantId,
            name,
            payload,
            idempotencyKey,
            timestamp: Date.now(),
            status: 'pending',
            attempts: 0
        };
        this.events.push(record);
        return this.deliver(record, consumer);
    }
    async deliver(record, consumer) {
        let attempt = 0;
        while (attempt < this.options.maxAttempts) {
            attempt += 1;
            record.attempts = attempt;
            const accepted = await consumer(record);
            if (accepted) {
                record.status = 'delivered';
                this.processed.set(`${record.tenantId}:${record.idempotencyKey}`, Date.now());
                return record.status;
            }
            await new Promise((resolve) => setTimeout(resolve, this.options.baseBackoffMs * attempt));
        }
        record.status = 'dead-lettered';
        this.dlq.push(record);
        return record.status;
    }
    replay(tenantId, since, until, consumer) {
        const subset = this.events.filter((event) => event.tenantId === tenantId && event.timestamp >= since && event.timestamp <= until);
        return Promise.all(subset.map((event) => this.deliver({ ...event, status: 'pending', attempts: 0 }, consumer)));
    }
    explorer(tenantId) {
        return this.events.filter((event) => event.tenantId === tenantId).map(({ payload, ...rest }) => ({
            ...rest,
            payload,
            signature: this.signPayload(payload)
        }));
    }
    deadLetterQueue() {
        return [...this.dlq];
    }
}
exports.EventBackbone = EventBackbone;
