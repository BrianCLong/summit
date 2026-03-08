"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planHash = exports.verifyShareToken = exports.signShareToken = exports.computeScopeHash = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SHARE_SECRET = process.env.SHARE_TOKEN_SECRET || 'dev-share-secret';
const computeScopeHash = (scope) => {
    const normalized = JSON.stringify({ tenantId: scope.tenantId, caseId: scope.caseId || null });
    return crypto_1.default.createHash('sha256').update(normalized).digest('hex');
};
exports.computeScopeHash = computeScopeHash;
const signShareToken = (payload, expiresAt) => {
    const expSeconds = Math.floor(expiresAt.getTime() / 1000);
    const fullPayload = {
        ...payload,
        exp: expSeconds,
    };
    return jsonwebtoken_1.default.sign(fullPayload, SHARE_SECRET);
};
exports.signShareToken = signShareToken;
const verifyShareToken = (token) => {
    return jsonwebtoken_1.default.verify(token, SHARE_SECRET);
};
exports.verifyShareToken = verifyShareToken;
const planHash = (input) => {
    const normalized = JSON.stringify(input, Object.keys(input).sort());
    return crypto_1.default.createHash('sha256').update(normalized).digest('hex');
};
exports.planHash = planHash;
