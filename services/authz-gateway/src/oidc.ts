import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

let remoteJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedJwksUri: string | null = null;

export interface OidcConfig {
  jwksUri: string;
  issuer: string;
  audience?: string;
}

function getOidcConfig(): OidcConfig {
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

export async function verifyOidcToken(token: string) {
  const config = getOidcConfig();
  if (!remoteJwks || cachedJwksUri !== config.jwksUri) {
    remoteJwks = createRemoteJWKSet(new URL(config.jwksUri));
    cachedJwksUri = config.jwksUri;
  }
  const { payload } = await jwtVerify(token, remoteJwks, {
    issuer: config.issuer,
    audience: config.audience,
  });
  return payload as JWTPayload & { acr?: string; amr?: string[] };
}

export function resetOidcCache() {
  remoteJwks = null;
  cachedJwksUri = null;
}

export function assertMfa(payload: JWTPayload & { acr?: string; amr?: string[] }) {
  const requireMfa =
    process.env.STAGING_REQUIRE_MFA === 'true' ||
    process.env.REQUIRE_MFA === 'true' ||
    process.env.GATEWAY_ENV === 'staging';
  if (!requireMfa) {
    return;
  }
  const acr = String(payload.acr || '');
  const amr = Array.isArray(payload.amr) ? payload.amr.map(String) : [];
  const hasMfaSignal =
    acr.toLowerCase().includes('loa2') ||
    acr.toLowerCase().includes('mfa') ||
    amr.some((method) => ['mfa', 'otp', 'hwk', 'fido2'].includes(method));
  if (!hasMfaSignal) {
    throw new Error('mfa_required');
  }
}
