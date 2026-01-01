// ============================================================================
// SECURITY: Credential Validation
// ============================================================================

function requireSecret(name: string, value: string | undefined, minLength: number = 32): string {
  if (!value) {
    console.error(`FATAL: ${name} environment variable is required but not set`);
    console.error(`Set ${name} in your environment or .env file`);
    process.exit(1);
  }

  if (value.length < minLength) {
    console.error(`FATAL: ${name} must be at least ${minLength} characters`);
    console.error(`Current length: ${value.length}`);
    process.exit(1);
  }

  const insecureValues = ['password', 'secret', 'changeme', 'default', 'dev-service', 'shared-secret'];
  if (insecureValues.some(v => value.toLowerCase().includes(v))) {
    console.error(`FATAL: ${name} is set to an insecure default value`);
    console.error(`Use a strong, unique secret (e.g., generated via: openssl rand -base64 32)`);
    process.exit(1);
  }

  return value;
}

import { SignJWT, jwtVerify } from 'jose';
import type { FastifyReply, FastifyRequest } from 'fastify';

const encoder = new TextEncoder();
const sharedSecret = requireSecret('SERVICE_AUTH_SHARED_SECRET', process.env.SERVICE_AUTH_SHARED_SECRET, 32);
const defaultIssuer = process.env.SERVICE_AUTH_ISSUER || 'summit-service-issuer';
const defaultKeyId = process.env.SERVICE_AUTH_KEY_ID || 'v1-dev';
const allowedCallers = (process.env.SERVICE_AUTH_DECISION_API || 'intelgraph-jobs,api-gateway')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export interface ServicePrincipal {
  serviceId: string;
  scopes: string[];
  keyId: string;
}

function getSecret() {
  return encoder.encode(sharedSecret);
}

export async function mintServiceToken({
  audience,
  serviceId,
  scopes = [],
  expiresInSeconds = 5 * 60,
}: {
  audience: string;
  serviceId: string;
  scopes?: string[];
  expiresInSeconds?: number;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ scp: scopes })
    .setProtectedHeader({ alg: 'HS256', kid: defaultKeyId })
    .setSubject(serviceId)
    .setAudience(audience)
    .setIssuer(defaultIssuer)
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds)
    .sign(getSecret());
}

export async function verifyServiceCaller(token: string): Promise<ServicePrincipal> {
  const { payload, protectedHeader } = await jwtVerify(token, getSecret(), {
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

export async function serviceAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
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
    (request as FastifyRequest & { servicePrincipal?: ServicePrincipal }).servicePrincipal =
      principal;
    request.log.info({
      service_sub: principal.serviceId,
      service_kid: principal.keyId,
      path: request.url,
    });
  } catch (error) {
    request.log.warn({
      service_error: (error as Error).message,
      path: request.url,
    });
    reply.status(403).send({ error: 'invalid_service_token' });
  }
}
