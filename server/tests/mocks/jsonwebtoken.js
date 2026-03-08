"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decode = exports.verify = exports.sign = void 0;
const crypto_1 = __importDefault(require("crypto"));
const encodeJwtPart = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const decodeJwtPart = (value) => JSON.parse(Buffer.from(value, 'base64url').toString());
const signJwtParts = (headerBase64, payloadBase64) => crypto_1.default.createHash('sha256').update(`${headerBase64}.${payloadBase64}`).digest('base64url');
const sign = (payload, _secret, options) => {
    const header = { typ: 'JWT', ...(options?.header ?? {}) };
    const headerBase64 = encodeJwtPart(header);
    const payloadBase64 = encodeJwtPart(payload);
    const signature = signJwtParts(headerBase64, payloadBase64);
    return `${headerBase64}.${payloadBase64}.${signature}`;
};
exports.sign = sign;
const verify = (token, _secret, options) => {
    const decoded = (0, exports.decode)(token, { complete: true });
    if (!decoded) {
        throw new Error('Invalid token format');
    }
    const [headerBase64, payloadBase64, signature] = token.split('.');
    if (!signature || signature !== signJwtParts(headerBase64, payloadBase64)) {
        throw new Error('invalid signature');
    }
    const payload = decoded.payload;
    if (options?.issuer && payload.iss !== options.issuer) {
        throw new Error('jwt issuer invalid');
    }
    if (options?.audience && payload.aud !== options.audience) {
        throw new Error('jwt audience invalid');
    }
    return payload;
};
exports.verify = verify;
const decode = (token, options) => {
    try {
        const [headerBase64, payloadBase64] = token.split('.');
        if (!headerBase64 || !payloadBase64)
            return null;
        const header = decodeJwtPart(headerBase64);
        const payload = decodeJwtPart(payloadBase64);
        return options?.complete ? { header, payload } : payload;
    }
    catch {
        return null;
    }
};
exports.decode = decode;
const jwt = {
    sign: exports.sign,
    verify: exports.verify,
    decode: exports.decode,
};
exports.default = jwt;
