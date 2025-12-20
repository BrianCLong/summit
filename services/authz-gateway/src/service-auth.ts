import type { NextFunction, Request, Response } from 'express';
import { SignJWT, jwtVerify } from 'jose/node/cjs';
import pino from 'pino';

export interface ServicePrincipal {
  serviceId: string;
  scopes: string[];
  keyId: string;
}

export interface ServiceTokenOptions {
  audience: string;
  expiresInSeconds?: number;
  scopes?: string[];
  issuer?: string;
  keyId?: string;
}

export interface VerifyOptions {
  audience: string;
  allowedServices: string[];
  requiredScopes?: string[];
}

const encoder = new TextEncoder();
const defaultIssuer =
  process.env.SERVICE_AUTH_ISSUER || 'summit-service-issuer';
const sharedSecret =
  process.env.SERVICE_AUTH_SHARED_SECRET || 'dev-service-shared-secret';
const defaultKeyId = process.env.SERVICE_AUTH_KEY_ID || 'v1-dev';

function getSecret() {
  return encoder.encode(sharedSecret);
}

export async function issueServiceToken({
  audience,
  expiresInSeconds = 5 * 60,
  scopes = [],
  issuer = defaultIssuer,
  keyId = defaultKeyId,
  serviceId,
}: ServiceTokenOptions & { serviceId: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ scp: scopes })
    .setProtectedHeader({ alg: 'HS256', kid: keyId })
    .setSubject(serviceId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds)
    .sign(getSecret());
}

export async function verifyServiceToken(
  token: string,
  { audience, allowedServices, requiredScopes = [] }: VerifyOptions,
): Promise<ServicePrincipal> {
  const { payload, protectedHeader } = await jwtVerify(token, getSecret(), {
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
    ? payload.scp.map((s: unknown) => String(s))
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

export function requireServiceAuth({
  audience,
  allowedServices,
  requiredScopes = [],
  headerName = 'x-service-token',
}: VerifyOptions & { headerName?: string }) {
  const logger = pino();
  return async (req: Request, res: Response, next: NextFunction) => {
    const rawToken =
      req.headers[headerName] ||
      req.headers['x-service-jwt'] ||
      req.headers['X-Service-JWT'];
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

      (
        req as Request & { servicePrincipal?: ServicePrincipal }
      ).servicePrincipal = principal;
      req.log?.info?.({
        service_aud: audience,
        service_sub: principal.serviceId,
        service_kid: principal.keyId,
      });
      return next();
    } catch (error) {
      logger.warn({
        service_aud: audience,
        service_error: (error as Error).message,
        path: req.path,
      });
      return res.status(403).json({ error: 'invalid_service_token' });
    }
  };
}
