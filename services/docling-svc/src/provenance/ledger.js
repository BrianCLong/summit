"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.provenanceEmitter = void 0;
const crypto_1 = __importDefault(require("crypto"));
const crypto_2 = require("crypto");
const events_1 = __importDefault(require("events"));
class ProvenanceEmitter extends events_1.default {
    emitEvent(event) {
        this.emit('provenance', event);
    }
    record(base) {
        const timestamp = new Date().toISOString();
        const sourceHash = hash(base.input);
        const outputHash = hash(base.output);
        const event = {
            ...base,
            promptHash: hash({ model: base.modelId, parameters: base.parameters }),
            timestamp,
            tenantId: base.tenantId,
            purpose: base.purpose,
            retention: base.retention,
            sourceHash,
            outputHash,
            auditTrail: {
                ledgerId: (0, crypto_2.randomUUID)(),
                version: '1.0',
                issuedAt: timestamp,
            },
        };
        this.emitEvent(event);
        return event;
    }
}
const hash = (input) => {
    return crypto_1.default
        .createHash('sha256')
        .update(JSON.stringify(input))
        .digest('hex');
};
exports.provenanceEmitter = new ProvenanceEmitter();
