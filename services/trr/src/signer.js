"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllowlistSigner = void 0;
const node_crypto_1 = require("node:crypto");
function canonicalizeEntries(entries) {
    return entries
        .map((entry) => ({
        ...entry,
        networkEgressClasses: [...entry.networkEgressClasses].sort(),
    }))
        .sort((a, b) => {
        const toolCompare = a.tool.localeCompare(b.tool);
        if (toolCompare !== 0) {
            return toolCompare;
        }
        return a.version.localeCompare(b.version);
    });
}
class AllowlistSigner {
    secret;
    keyId;
    algorithm;
    baseTimestamp;
    constructor(config) {
        this.secret = config.secret;
        this.keyId = config.keyId ?? `key-${(0, node_crypto_1.randomBytes)(4).toString('hex')}`;
        this.algorithm = config.algorithm ?? 'sha256';
        this.baseTimestamp = new Date(config.deterministicBase ?? '2020-01-01T00:00:00.000Z');
    }
    sign(payload) {
        const canonicalEntries = canonicalizeEntries(payload.entries);
        const generatedAt = payload.generatedAt ??
            this.canonicalTimestamp(canonicalEntries, payload.environment);
        const canonical = JSON.stringify({
            environment: payload.environment,
            generatedAt,
            entries: canonicalEntries,
        });
        const signature = (0, node_crypto_1.createHmac)(this.algorithm, this.secret)
            .update(canonical)
            .digest('hex');
        return {
            environment: payload.environment,
            generatedAt,
            entries: canonicalEntries,
            signature,
            signer: this.keyId,
        };
    }
    canonicalTimestamp(entries, environment) {
        if (entries.length === 0) {
            return this.baseTimestamp.toISOString();
        }
        const hash = (0, node_crypto_1.createHash)('sha256').update(environment).digest('hex');
        const seconds = Number(BigInt(`0x${hash.slice(0, 8)}`) % BigInt(3600 * 24));
        const generatedDate = new Date(this.baseTimestamp.getTime() + seconds * 1000);
        generatedDate.setUTCMilliseconds(0);
        return generatedDate.toISOString();
    }
}
exports.AllowlistSigner = AllowlistSigner;
