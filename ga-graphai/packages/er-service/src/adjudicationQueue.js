"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdjudicationQueue = void 0;
const node_crypto_1 = require("node:crypto");
class AdjudicationQueue {
    decisions = [];
    clock;
    idFactory;
    constructor(options = {}) {
        this.clock = options.clock ?? (() => new Date());
        this.idFactory = options.idFactory ?? (() => (0, node_crypto_1.randomUUID)());
    }
    enqueue(input) {
        const decision = {
            ...input,
            id: this.idFactory('adj'),
            status: 'queued',
            createdAt: this.clock().toISOString(),
        };
        this.decisions.push(decision);
        return decision;
    }
    resolve(id, resolutionNote) {
        const decision = this.decisions.find((item) => item.id === id);
        if (!decision) {
            throw new Error(`Adjudication decision ${id} not found`);
        }
        decision.status = 'resolved';
        decision.resolutionNote = resolutionNote;
        decision.resolvedAt = this.clock().toISOString();
        return decision;
    }
    list(query = {}) {
        return this.decisions
            .filter((decision) => {
            if (query.tenantId && decision.tenantId !== query.tenantId) {
                return false;
            }
            if (query.status && decision.status !== query.status) {
                return false;
            }
            if (query.action && decision.action !== query.action) {
                return false;
            }
            return true;
        })
            .map((decision) => ({ ...decision }));
    }
}
exports.AdjudicationQueue = AdjudicationQueue;
