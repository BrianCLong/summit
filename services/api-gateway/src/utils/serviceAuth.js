"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildServiceToken = buildServiceToken;
exports.buildServiceHeaders = buildServiceHeaders;
const jose_1 = require("jose");
const encoder = new TextEncoder();
const sharedSecret = process.env.SERVICE_AUTH_SHARED_SECRET || 'dev-service-shared-secret';
const defaultKeyId = process.env.SERVICE_AUTH_KEY_ID || 'v1-dev';
const issuer = process.env.SERVICE_AUTH_ISSUER || 'summit-service-issuer';
const callerId = process.env.SERVICE_AUTH_CALLER_ID || 'api-gateway';
function getSecret() {
    return encoder.encode(sharedSecret);
}
async function buildServiceToken(audience, scopes = []) {
    const now = Math.floor(Date.now() / 1000);
    return new jose_1.SignJWT({ scp: scopes })
        .setProtectedHeader({ alg: 'HS256', kid: defaultKeyId })
        .setIssuer(issuer)
        .setSubject(callerId)
        .setAudience(audience)
        .setIssuedAt(now)
        .setExpirationTime(now + 5 * 60)
        .sign(getSecret());
}
async function buildServiceHeaders(audience, scopes = []) {
    const token = await buildServiceToken(audience, scopes);
    return {
        'X-Service-Token': token,
    };
}
