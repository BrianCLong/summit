"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeJoinClient = exports.SafeJoinParticipant = exports.SimpleBloom = void 0;
exports.preparePayload = preparePayload;
const axios_1 = __importDefault(require("axios"));
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const crypto_1 = require("crypto");
const DEFAULT_BLOOM_M = 2048;
const DEFAULT_BLOOM_K = 3;
function laplaceNoise(scale) {
    const u = ((0, crypto_1.randomInt)(1_000_000) + 0.5) / 1_000_000;
    const sign = u - 0.5 >= 0 ? 1 : -1;
    const magnitude = Math.log(Math.max(1 - 2 * Math.abs(u - 0.5), 1e-12));
    return -scale * sign * magnitude;
}
class SimpleBloom {
    m;
    k;
    bits;
    constructor(m = DEFAULT_BLOOM_M, k = DEFAULT_BLOOM_K) {
        this.m = m;
        this.k = k;
        this.bits = new Uint8Array(Math.ceil(m / 8));
    }
    insert(value) {
        for (let i = 0; i < this.k; i += 1) {
            const hash = computeHash(value, i);
            const index = Number(hash % BigInt(this.m));
            const byteIndex = Math.floor(index / 8);
            const bitIndex = index % 8;
            this.bits[byteIndex] |= 1 << bitIndex;
        }
    }
    encode() {
        return {
            m: this.m,
            k: this.k,
            bits: Buffer.from(this.bits).toString('base64'),
        };
    }
}
exports.SimpleBloom = SimpleBloom;
function computeHash(value, salt) {
    const h = (0, crypto_1.createHash)('sha256');
    h.update(value);
    h.update(Buffer.from([salt]));
    return BigInt('0x' + h.digest('hex'));
}
class SafeJoinParticipant {
    secretKey;
    publicKeyB64;
    constructor() {
        const secret = tweetnacl_1.default.randomBytes(32);
        this.secretKey = secret;
        const publicKey = tweetnacl_1.default.scalarMult.base(secret);
        this.publicKeyB64 = Buffer.from(publicKey).toString('base64');
    }
    deriveSharedSecret(peerPublicKey) {
        const peer = Buffer.from(peerPublicKey, 'base64');
        return tweetnacl_1.default.scalarMult(this.secretKey, peer);
    }
    hashTokens(sharedSecret, keys) {
        return keys.map((key) => {
            const mac = (0, crypto_1.createHmac)('sha256', Buffer.from(sharedSecret));
            mac.update(Buffer.from(key, 'utf8'));
            return mac.digest('base64');
        });
    }
    aggregatesWithNoise(tokens, values, epsilon) {
        const scale = 1 / Math.max(epsilon, 1e-6);
        const aggregates = {};
        tokens.forEach((token, idx) => {
            const existing = aggregates[token] ?? { noisy_sum: 0, noisy_count: 0 };
            existing.noisy_sum += values[idx] + laplaceNoise(scale);
            existing.noisy_count += 1 + laplaceNoise(scale);
            aggregates[token] = existing;
        });
        return aggregates;
    }
}
exports.SafeJoinParticipant = SafeJoinParticipant;
class SafeJoinClient {
    baseUrl;
    http;
    constructor(baseUrl, instance) {
        this.baseUrl = baseUrl;
        this.http = instance ?? axios_1.default.create({ baseURL: baseUrl });
    }
    async createSession(mode, opts = {}) {
        const payload = {
            expected_participants: opts.expectedParticipants ?? 2,
            fault_probability: opts.faultProbability,
            mode: mode === 'aggregate'
                ? { mode: 'aggregate', epsilon: opts.epsilon ?? 1.0 }
                : { mode: 'intersection_only' },
        };
        const { data } = await this.http.post('/sessions', payload);
        return data.session_id;
    }
    async register(sessionId, participantId, publicKey) {
        const { data } = await this.http.post(`/sessions/${sessionId}/register`, {
            participant_id: participantId,
            public_key: publicKey,
        });
        return data.peer_public_key;
    }
    async waitForPeer(sessionId, participantId, timeoutMs = 30_000) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const response = await this.http.get(`/sessions/${sessionId}/peer`, {
                params: { participant_id: participantId },
                validateStatus: () => true,
            });
            if (response.status === 202) {
                await new Promise((resolve) => setTimeout(resolve, 500));
                continue;
            }
            if (response.status >= 200 && response.status < 300) {
                return response.data.peer_public_key;
            }
            throw new Error(`peer lookup failed: ${response.status}`);
        }
        throw new Error('peer not available before timeout');
    }
    async upload(sessionId, payload) {
        await this.http.post(`/sessions/${sessionId}/upload`, payload);
    }
    async fetchResult(sessionId) {
        const { data } = await this.http.get(`/sessions/${sessionId}/result`);
        return data;
    }
}
exports.SafeJoinClient = SafeJoinClient;
function preparePayload(participant, peerPublicKey, records, epsilon) {
    const secret = participant.deriveSharedSecret(peerPublicKey);
    const tokens = participant.hashTokens(secret, records.map((r) => r.key));
    const bloom = new SimpleBloom();
    tokens.forEach((token) => bloom.insert(Buffer.from(token, 'base64')));
    let aggregates;
    if (epsilon !== undefined) {
        aggregates = participant.aggregatesWithNoise(tokens, records.map((r) => r.value), epsilon);
    }
    return { tokens, bloom, aggregates };
}
