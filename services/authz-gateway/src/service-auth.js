"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueServiceToken = issueServiceToken;
exports.verifyServiceToken = verifyServiceToken;
exports.requireServiceAuth = requireServiceAuth;
const jose_1 = require("jose");
const pino_1 = __importDefault(require("pino"));
const encoder = new TextEncoder();
const defaultIssuer = process.env.SERVICE_AUTH_ISSUER || 'summit-service-issuer';
const sharedSecret = process.env.SERVICE_AUTH_SHARED_SECRET || 'dev-service-shared-secret';
const defaultKeyId = process.env.SERVICE_AUTH_KEY_ID || 'v1-dev';
function getSecret() {
    return encoder.encode(sharedSecret);
}
async function issueServiceToken({ audience, expiresInSeconds = 5 * 60, scopes = [], issuer = defaultIssuer, keyId = defaultKeyId, serviceId, }) {
    const now = Math.floor(Date.now() / 1000);
    return new jose_1.SignJWT({ scp: scopes })
        .setProtectedHeader({ alg: 'HS256', kid: keyId })
        .setSubject(serviceId)
        .setIssuer(issuer)
        .setAudience(audience)
        .setIssuedAt(now)
        .setExpirationTime(now + expiresInSeconds)
        .sign(getSecret());
}
async function verifyServiceToken(token, { audience, allowedServices, requiredScopes = [] }) {
    const { payload, protectedHeader } = await (0, jose_1.jwtVerify)(token, getSecret(), {
        audience,
        issuer: defaultIssuer,
    });
    const serviceId = payload.sub;
    if (!serviceId) {
        throw new Error('missing_subject');
    }
    if (!allowedServices.includes(serviceId)) {
        throw new Error('unknown_service');
    }
    const scopes = Array.isArray(payload.scp)
        ? payload.scp.map((s) => String(s))
        : [];
    for (const scope of requiredScopes) {
        if (!scopes.includes(scope)) {
            throw new Error(`missing_scope:${scope}`);
        }
    }
    return {
        serviceId,
        scopes,
        keyId: protectedHeader.kid ? String(protectedHeader.kid) : 'unknown',
    };
}
function requireServiceAuth({ audience, allowedServices, requiredScopes = [], headerName = 'x-service-token', }) {
    const logger = (0, pino_1.default)();
    return async (req, res, next) => {
        const rawToken = req.headers[headerName] || req.headers['x-service-jwt'] || req.headers['X-Service-JWT'];
        const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
        if (!token || typeof token !== 'string') {
            req.log?.warn?.({
                service_aud: audience,
                service_error: 'missing_service_token',
                path: req.path,
            });
            return res.status(401).json({ error: 'missing_service_token' });
        }
        try {
            const principal = await verifyServiceToken(token, {
                audience,
                allowedServices,
                requiredScopes,
            });
            req.servicePrincipal = principal;
            req.log?.info?.({
                service_aud: audience,
                service_sub: principal.serviceId,
                service_kid: principal.keyId,
            });
            return next();
        }
        catch (error) {
            logger.warn({
                service_aud: audience,
                service_error: error.message,
                path: req.path,
            });
            return res.status(403).json({ error: 'invalid_service_token' });
        }
    };
}
