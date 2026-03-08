"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mintCapToken = mintCapToken;
exports.verifyCapToken = verifyCapToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function mintCapToken({ runId, stepId, tenant, caps, }) {
    return jsonwebtoken_1.default.sign({
        sub: `${tenant}:${runId}:${stepId}`,
        caps,
        aud: 'plugin',
        iat: Math.floor(Date.now() / 1000),
    }, process.env.CAPS_SIGNING_KEY, { algorithm: 'HS256', expiresIn: '10m' });
}
function verifyCapToken(token) {
    return jsonwebtoken_1.default.verify(token, process.env.CAPS_SIGNING_KEY);
}
