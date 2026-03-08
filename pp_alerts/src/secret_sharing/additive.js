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
exports.split = split;
exports.reconstruct = reconstruct;
const crypto = __importStar(require("crypto"));
function split(value, nShares, modulus) {
    if (nShares < 2) {
        throw new Error("Need at least 2 shares");
    }
    if (value >= modulus) {
        throw new Error("Value must be less than modulus");
    }
    const shares = [];
    let sum = 0;
    for (let i = 0; i < nShares - 1; i++) {
        // Generate random share
        const s = crypto.randomInt(0, modulus);
        shares.push(createShare(i, s));
        sum = (sum + s) % modulus;
    }
    // Calculate last share
    // sum + last = value (mod M) => last = value - sum (mod M)
    let last = (value - sum) % modulus;
    if (last < 0) {
        last += modulus;
    }
    shares.push(createShare(nShares - 1, last));
    return { shares, modulus };
}
function createShare(index, value) {
    const hmacKey = process.env.PP_ALERTS_HMAC_KEY;
    if (!hmacKey) {
        throw new Error("PP_ALERTS_HMAC_KEY environment variable is not set");
    }
    const payload = `${index}:${value}`;
    const tag = crypto.createHmac('sha256', hmacKey).update(payload).digest('hex');
    return { index, value, tag };
}
function reconstruct(bundle) {
    const hmacKey = process.env.PP_ALERTS_HMAC_KEY;
    if (!hmacKey) {
        throw new Error("PP_ALERTS_HMAC_KEY environment variable is not set");
    }
    let sum = 0;
    for (const share of bundle.shares) {
        // Verify tag
        const payload = `${share.index}:${share.value}`;
        const expectedTag = crypto.createHmac('sha256', hmacKey).update(payload).digest('hex');
        if (share.tag !== expectedTag) {
            throw new Error(`Integrity check failed for share ${share.index}`);
        }
        sum = (sum + share.value) % bundle.modulus;
    }
    return sum;
}
