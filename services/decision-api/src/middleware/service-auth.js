"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mintServiceToken = mintServiceToken;
exports.verifyServiceCaller = verifyServiceCaller;
exports.serviceAuthMiddleware = serviceAuthMiddleware;
const jose_1 = require("jose");
const encoder = new TextEncoder();
const sharedSecret = process.env.SERVICE_AUTH_SHARED_SECRET || 'dev-service-shared-secret';
const defaultIssuer = process.env.SERVICE_AUTH_ISSUER || 'summit-service-issuer';
const defaultKeyId = process.env.SERVICE_AUTH_KEY_ID || 'v1-dev';
const allowedCallers = (process.env.SERVICE_AUTH_DECISION_API || 'intelgraph-jobs,api-gateway')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
function getSecret() {
    return encoder.encode(sharedSecret);
}
async function mintServiceToken({ audience, serviceId, scopes = [], expiresInSeconds = 5 * 60, }) {
    const now = Math.floor(Date.now() / 1000);
    return new jose_1.SignJWT({ scp: scopes })
        .setProtectedHeader({ alg: 'HS256', kid: defaultKeyId })
        .setSubject(serviceId)
        .setAudience(audience)
        .setIssuer(defaultIssuer)
        .setIssuedAt(now)
        .setExpirationTime(now + expiresInSeconds)
        .sign(getSecret());
}
async function verifyServiceCaller(token) {
    const { payload, protectedHeader } = await (0, jose_1.jwtVerify)(token, getSecret(), {
        audience: 'decision-api',
        issuer: defaultIssuer,
    });
    const serviceId = payload.sub;
    if (!serviceId) {
        throw new Error('missing_subject');
    }
    if (!allowedCallers.includes(serviceId)) {
        throw new Error('unknown_service');
    }
    const scopes = Array.isArray(payload.scp)
        ? payload.scp.map((s) => String(s))
        : [];
    if (!scopes.includes('decision:write')) {
        throw new Error('missing_scope:decision:write');
    }
    return {
        serviceId,
        scopes,
        keyId: protectedHeader.kid ? String(protectedHeader.kid) : 'unknown',
    };
}
async function serviceAuthMiddleware(request, reply) {
    if (request.url.startsWith('/health')) {
        return;
    }
    const headerToken = request.headers['x-service-token'] || request.headers['x-service-jwt'];
    const token = Array.isArray(headerToken) ? headerToken[0] : headerToken;
    if (!token || typeof token !== 'string') {
        return;
    }
    try {
        const principal = await verifyServiceCaller(token);
        request.servicePrincipal =
            principal;
        request.log.info({
            service_sub: principal.serviceId,
            service_kid: principal.keyId,
            path: request.url,
        });
    }
    catch (error) {
        request.log.warn({
            service_error: error.message,
            path: request.url,
        });
        reply.status(403).send({ error: 'invalid_service_token' });
    }
}
