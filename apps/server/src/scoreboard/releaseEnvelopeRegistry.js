"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReleaseEnvelopeRegistry = void 0;
const crypto_1 = require("crypto");
class ReleaseEnvelopeRegistry {
    envelopes = new Map();
    register(params) {
        const createdAt = params.createdAt ?? new Date().toISOString();
        const envelope = {
            ...params,
            id: (0, crypto_1.randomUUID)(),
            createdAt,
        };
        this.envelopes.set(params.domainId, envelope);
        return envelope;
    }
    get(domainId) {
        const envelope = this.envelopes.get(domainId);
        if (!envelope)
            return undefined;
        if (envelope.expiresAt && new Date(envelope.expiresAt).getTime() <= Date.now()) {
            this.envelopes.delete(domainId);
            return undefined;
        }
        return envelope;
    }
}
exports.ReleaseEnvelopeRegistry = ReleaseEnvelopeRegistry;
