"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCustodyChain = verifyCustodyChain;
function timestampToUnixNano(timestamp) {
    const match = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$/);
    if (!match) {
        throw new Error(`invalid timestamp ${timestamp}`);
    }
    const [, year, month, day, hour, minute, second, fraction = ''] = match;
    const secondsSinceEpoch = BigInt(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)) / 1000);
    const nanos = BigInt((fraction.padEnd(9, '0')).slice(0, 9));
    return (secondsSinceEpoch * 1000000000n + nanos).toString();
}
async function sha256Hex(input) {
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
        const encoder = new TextEncoder();
        const digest = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(input));
        return Array.from(new Uint8Array(digest))
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('');
    }
    const { createHash } = await Promise.resolve().then(() => __importStar(require('crypto')));
    return createHash('sha256').update(input).digest('hex');
}
async function computeHash(prevHash, event) {
    const unixNano = timestampToUnixNano(event.timestamp);
    const payload = `${prevHash}|${event.holdId}|${event.system}|${event.action}|${unixNano}|${event.scopeFingerprint}`;
    return sha256Hex(payload);
}
async function verifyCustodyChain(events) {
    if (events.length === 0) {
        return { valid: false, message: 'No custody events recorded.' };
    }
    const applyFingerprints = new Map();
    const verifiedSystems = new Set();
    let prevHash = '';
    for (const event of events) {
        const expectedHash = await computeHash(prevHash, event);
        if (expectedHash !== event.hash) {
            return {
                valid: false,
                message: `Hash mismatch at sequence ${event.sequence} for ${event.system}.`,
            };
        }
        if (event.action === 'apply') {
            applyFingerprints.set(event.system, event.scopeFingerprint);
        }
        if (event.action === 'verify') {
            const fingerprint = applyFingerprints.get(event.system);
            if (!fingerprint) {
                return {
                    valid: false,
                    message: `Verification encountered before apply for ${event.system}.`,
                };
            }
            if (fingerprint !== event.scopeFingerprint) {
                return {
                    valid: false,
                    message: `Fingerprint changed for ${event.system}.`,
                };
            }
            verifiedSystems.add(event.system);
        }
        prevHash = event.hash;
    }
    if (verifiedSystems.size === 0) {
        return { valid: false, message: 'No verification events were captured.' };
    }
    return { valid: true };
}
