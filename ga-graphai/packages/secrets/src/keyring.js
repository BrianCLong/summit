"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildKeyRing = buildKeyRing;
exports.selectSigningKey = selectSigningKey;
exports.signTokenWithKeyRing = signTokenWithKeyRing;
exports.verifyTokenWithKeyRing = verifyTokenWithKeyRing;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
async function resolveSecret(definition, manager) {
    if (typeof definition.secret === 'string') {
        return definition.secret;
    }
    if (!manager) {
        throw new Error('Secret manager is required to resolve external secret references');
    }
    const resolution = await manager.resolve(definition.secret);
    return resolution.value;
}
function normalizeDate(value) {
    if (!value)
        return undefined;
    return value instanceof Date ? value : new Date(value);
}
function chooseActiveKey(keys, now, rotationEnabled) {
    if (!rotationEnabled) {
        return keys[0];
    }
    const eligible = keys
        .filter((key) => !key.notBefore || key.notBefore <= now)
        .sort((a, b) => {
        const aTime = a.notBefore?.getTime() ?? 0;
        const bTime = b.notBefore?.getTime() ?? 0;
        return bTime - aTime;
    });
    return eligible[0] ?? keys[0];
}
async function buildKeyRing(definitions, manager, options = {}) {
    if (definitions.length === 0) {
        throw new Error('At least one key definition is required to build a key ring');
    }
    const now = options.now ?? new Date();
    const rotationEnabled = options.rotationEnabled ?? process.env.KEY_ROTATION === '1';
    const overlapSeconds = options.overlapSeconds ?? 300;
    const materials = [];
    for (const definition of definitions) {
        const secret = await resolveSecret(definition, manager);
        materials.push({
            kid: definition.kid,
            secret,
            algorithm: definition.algorithm ?? 'HS256',
            notBefore: normalizeDate(definition.notBefore),
            expiresAt: normalizeDate(definition.expiresAt),
        });
    }
    const active = chooseActiveKey(materials, now, rotationEnabled);
    return {
        active,
        keys: materials,
        overlapSeconds,
        rotationEnabled,
        evaluatedAt: now,
    };
}
function selectSigningKey(ring) {
    return ring.active;
}
function withinOverlapWindow(target, ring, now) {
    if (!ring.rotationEnabled || target.kid === ring.active.kid) {
        return true;
    }
    const anchor = ring.active.notBefore?.getTime() ?? ring.evaluatedAt.getTime();
    const overlapEnd = anchor + ring.overlapSeconds * 1000;
    return now.getTime() <= overlapEnd;
}
function signTokenWithKeyRing(payload, ring, options = {}) {
    const key = selectSigningKey(ring);
    return jsonwebtoken_1.default.sign(payload, key.secret, {
        keyid: key.kid,
        algorithm: key.algorithm,
        ...options,
    });
}
function verifyTokenWithKeyRing(token, ring, options = {}) {
    const decoded = jsonwebtoken_1.default.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
        throw new Error('Token could not be decoded');
    }
    const now = options.now ?? new Date();
    const kid = decoded.header.kid;
    if (!kid) {
        throw new Error('Token missing kid header');
    }
    const candidate = ring.keys.find((key) => key.kid === kid);
    if (!candidate) {
        throw new Error(`No key found for kid ${kid}`);
    }
    if (candidate.expiresAt && now > candidate.expiresAt) {
        throw new Error(`Key ${kid} expired`);
    }
    if (!withinOverlapWindow(candidate, ring, now)) {
        throw new Error(`Key ${kid} is outside the rotation overlap window`);
    }
    return jsonwebtoken_1.default.verify(token, candidate.secret, {
        algorithms: [candidate.algorithm],
        ...options,
    });
}
