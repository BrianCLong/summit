"use strict";
/**
 * Cryptographically Secure Random Utilities
 *
 * This module provides cryptographically secure alternatives to Math.random()
 * for security-sensitive operations.
 *
 * SECURITY: Never use Math.random() for security-sensitive operations such as:
 * - Generating tokens, session IDs, or API keys
 * - Creating cryptographic nonces or IVs
 * - Generating passwords or secrets
 * - Any operation where unpredictability is a security requirement
 */
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
exports.randomString = randomString;
exports.randomInt = randomInt;
exports.randomFloat = randomFloat;
exports.randomUUID = randomUUID;
exports.generateToken = generateToken;
exports.generateId = generateId;
exports.safeCompare = safeCompare;
exports.insecureRandom = insecureRandom;
const crypto = __importStar(require("crypto"));
/**
 * Generate a cryptographically secure random string
 * @param length - The length of the string to generate
 * @param encoding - The encoding to use (default: 'hex')
 * @returns A cryptographically secure random string
 */
function randomString(length = 32, 
// eslint-disable-next-line no-undef
encoding = 'hex') {
    const bytes = Math.ceil(length / 2);
    return crypto.randomBytes(bytes).toString(encoding).slice(0, length);
}
/**
 * Generate a cryptographically secure random integer
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (exclusive)
 * @returns A cryptographically secure random integer
 */
function randomInt(min, max) {
    if (min >= max) {
        throw new Error('min must be less than max');
    }
    return crypto.randomInt(min, max);
}
/**
 * Generate a cryptographically secure random float between 0 and 1
 * @returns A cryptographically secure random float
 */
function randomFloat() {
    // Generate 4 bytes (32 bits) for good precision
    const buffer = crypto.randomBytes(4);
    const value = buffer.readUInt32BE(0);
    // Divide by max 32-bit unsigned int to get a value between 0 and 1
    return value / 0xFFFFFFFF;
}
/**
 * Generate a cryptographically secure UUID v4
 * @returns A cryptographically secure UUID
 */
function randomUUID() {
    return crypto.randomUUID();
}
/**
 * Generate a cryptographically secure token
 * @param bytes - Number of random bytes (default: 32)
 * @returns A cryptographically secure token in base64url format
 */
function generateToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('base64url');
}
/**
 * Generate a cryptographically secure ID suitable for database records
 * @param prefix - Optional prefix for the ID
 * @returns A cryptographically secure ID
 */
function generateId(prefix) {
    const timestamp = Date.now().toString(36);
    const randomPart = crypto.randomBytes(8).toString('base64url');
    if (prefix) {
        return `${prefix}_${timestamp}_${randomPart}`;
    }
    return `${timestamp}_${randomPart}`;
}
/**
 * Constant-time comparison to prevent timing side-channel attacks.
 */
function safeCompare(a, b) {
    try {
        return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    }
    catch (err) {
        return false;
    }
}
/**
 * SECURITY WARNING: This function is for non-cryptographic purposes only
 * Use for things like jitter in retry logic, sampling, etc.
 * For security-sensitive operations, use the cryptographically secure alternatives above
 */
function insecureRandom() {
    console.warn('SECURITY WARNING: Using Math.random() for non-cryptographic purpose. ' +
        'If this is security-sensitive, use randomFloat() instead.');
    return Math.random();
}
