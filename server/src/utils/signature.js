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
exports.hmacHex = hmacHex;
exports.safeEqual = safeEqual;
const crypto = __importStar(require("crypto"));
/**
 * Computes an HMAC digest in hexadecimal format.
 *
 * @param algorithm - The hashing algorithm to use ('sha256' or 'sha1').
 * @param secret - The secret key for the HMAC.
 * @param payloadRaw - The data to sign as a Buffer.
 * @returns The hexadecimal string representation of the HMAC digest.
 */
function hmacHex(algorithm, secret, payloadRaw) {
    return crypto.createHmac(algorithm, secret).update(payloadRaw).digest('hex');
}
/**
 * Performs a constant-time comparison of two strings to prevent timing attacks.
 *
 * @param a - The first string to compare.
 * @param b - The second string to compare.
 * @returns True if the strings are equal, false otherwise.
 */
function safeEqual(a, b) {
    const ab = Buffer.from(a, 'utf8');
    const bb = Buffer.from(b, 'utf8');
    if (ab.length !== bb.length)
        return false;
    try {
        return crypto.timingSafeEqual(ab, bb);
    }
    catch {
        return false;
    }
}
