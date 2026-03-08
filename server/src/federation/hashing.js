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
exports.IdentifierHasher = void 0;
const crypto = __importStar(require("crypto"));
const types_js_1 = require("./types.js");
class IdentifierHasher {
    static tenantSalts = new Map();
    static getSalt(tenantId) {
        if (!this.tenantSalts.has(tenantId)) {
            // For MVP, generate a deterministic salt based on tenantId
            // In production, this would be retrieved from a KMS or secure configuration
            const salt = crypto.createHash('sha256').update(tenantId + 'MVP_SALT_SEED_2025').digest('hex');
            this.tenantSalts.set(tenantId, salt);
        }
        return this.tenantSalts.get(tenantId);
    }
    static normalize(value, type) {
        let normalized = value.trim().toLowerCase();
        if (type === types_js_1.IdentifierType.PHONE) {
            // Basic E.164-ish normalization: remove non-digits
            normalized = normalized.replace(/[^\d+]/g, '');
        }
        // Additional normalization rules can be added here
        return normalized;
    }
    /**
     * Generates a deterministic HMAC-SHA256 hash for the identifier.
     */
    static hash(value, type, tenantId) {
        const normalized = this.normalize(value, type);
        const salt = this.getSalt(tenantId);
        return crypto.createHmac('sha256', salt).update(normalized).digest('hex');
    }
}
exports.IdentifierHasher = IdentifierHasher;
