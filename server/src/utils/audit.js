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
exports.writeAudit = writeAudit;
const crypto = __importStar(require("crypto"));
const database_js_1 = require("../config/database.js");
/**
 * Computes a deep difference between two JSON objects.
 *
 * @param before - The original object.
 * @param after - The modified object.
 * @returns An object representing the changed keys and their values.
 */
function deepDiff(before = {}, after = {}) {
    // Simple structural diff capturing changed keys only
    const changed = {};
    const keys = new Set([
        ...Object.keys(before || {}),
        ...Object.keys(after || {}),
    ]);
    for (const k of Array.from(keys)) {
        const bv = before?.[k];
        const av = after?.[k];
        const bothObjects = bv && av && typeof bv === 'object' && typeof av === 'object';
        if (bothObjects) {
            const nested = deepDiff(bv, av);
            if (nested && Object.keys(nested).length)
                changed[k] = nested;
        }
        else if (JSON.stringify(bv) !== JSON.stringify(av)) {
            changed[k] = { before: bv, after: av };
        }
    }
    return changed;
}
/**
 * Signs the audit payload using an HMAC-SHA256 signature for integrity verification.
 *
 * @param payload - The payload to sign.
 * @param secret - The signing secret.
 * @returns The Base64 encoded signature, or null if signing fails.
 */
function signAuditPayload(payload, secret) {
    try {
        const h = crypto.createHmac('sha256', String(secret));
        h.update(Buffer.from(JSON.stringify(payload)));
        return h.digest('base64');
    }
    catch (_) {
        return null;
    }
}
/**
 * Writes an audit log entry to the database.
 *
 * It automatically computes the diff between `before` and `after` states if provided,
 * and signs the payload if an audit signing secret is configured.
 *
 * Failures to write to the audit log are swallowed to prevent breaking the main application flow,
 * but should be monitored.
 *
 * @param params - The audit log parameters.
 * @returns A Promise that resolves when the log entry is written (or silently fails).
 */
async function writeAudit({ userId, action, resourceType, resourceId, details = {}, ip, userAgent, actorRole, sessionId, before, after, }) {
    try {
        const pool = (0, database_js_1.getPostgresPool)();
        const enrichedDetails = { ...details };
        if (before || after) {
            enrichedDetails.before = before ?? null;
            enrichedDetails.after = after ?? null;
            enrichedDetails.diff = deepDiff(before || {}, after || {});
        }
        if (actorRole)
            enrichedDetails.actorRole = actorRole;
        if (sessionId)
            enrichedDetails.sessionId = sessionId;
        if (ip)
            enrichedDetails.ip = ip;
        // Signature for integrity
        const secret = process.env.AUDIT_SIGNING_SECRET;
        if (secret) {
            enrichedDetails.signature = signAuditPayload({
                userId: userId || null,
                action,
                resourceType: resourceType || null,
                resourceId: resourceId || null,
                before: enrichedDetails.before ?? null,
                after: enrichedDetails.after ?? null,
                at: new Date().toISOString(),
            }, secret);
        }
        await pool.query(`INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
            userId || null,
            action,
            resourceType || null,
            resourceId || null,
            enrichedDetails,
            ip || null,
            userAgent || null,
        ]);
    }
    catch (e) {
        // non-fatal, avoid throwing in hot paths
    }
}
