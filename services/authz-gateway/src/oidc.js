"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOidcToken = verifyOidcToken;
exports.resetOidcCache = resetOidcCache;
exports.assertMfa = assertMfa;
const jose_1 = require("jose");
let remoteJwks = null;
let cachedJwksUri = null;
function getOidcConfig() {
    const jwksUri = process.env.OIDC_JWKS_URI;
    const issuer = process.env.OIDC_ISSUER;
    if (!jwksUri || !issuer) {
        throw new Error('oidc_not_configured');
    }
    return {
        jwksUri,
        issuer,
        audience: process.env.OIDC_AUDIENCE,
    };
}
async function verifyOidcToken(token) {
    const config = getOidcConfig();
    if (!remoteJwks || cachedJwksUri !== config.jwksUri) {
        remoteJwks = (0, jose_1.createRemoteJWKSet)(new URL(config.jwksUri));
        cachedJwksUri = config.jwksUri;
    }
    const { payload } = await (0, jose_1.jwtVerify)(token, remoteJwks, {
        issuer: config.issuer,
        audience: config.audience,
    });
    return payload;
}
function resetOidcCache() {
    remoteJwks = null;
    cachedJwksUri = null;
}
function assertMfa(payload) {
    const requireMfa = process.env.STAGING_REQUIRE_MFA === 'true' ||
        process.env.REQUIRE_MFA === 'true' ||
        process.env.GATEWAY_ENV === 'staging';
    if (!requireMfa) {
        return;
    }
    const acr = String(payload.acr || '');
    const amr = Array.isArray(payload.amr) ? payload.amr.map(String) : [];
    const hasMfaSignal = acr.toLowerCase().includes('loa2') ||
        acr.toLowerCase().includes('mfa') ||
        amr.some((method) => ['mfa', 'otp', 'hwk', 'fido2'].includes(method));
    if (!hasMfaSignal) {
        throw new Error('mfa_required');
    }
}
