import axios from 'axios';
import { createRemoteJWKSet, jwtVerify } from 'jose';

interface OidcConfig {
  issuer: string;
  tokenEndpoint: string;
  jwksUri: string;
  clientId: string;
  clientSecret: string;
}

let configPromise: Promise<OidcConfig> | undefined;
let jwkSet: ReturnType<typeof createRemoteJWKSet> | undefined;

async function getConfig(): Promise<OidcConfig> {
  if (!configPromise) {
    const issuerUrl = process.env.OIDC_ISSUER;
    const clientId = process.env.OIDC_CLIENT_ID;
    const clientSecret = process.env.OIDC_CLIENT_SECRET;
    if (!issuerUrl || !clientId || !clientSecret) {
      throw new Error('oidc_not_configured');
    }
    configPromise = (async () => {
      try {
        const discoveryUrl = new URL(
          '/.well-known/openid-configuration',
          issuerUrl,
        ).toString();
        const { data } = await axios.get(discoveryUrl);
        const tokenEndpoint =
          data.token_endpoint || new URL('/oauth/token', issuerUrl).toString();
        const jwksUri =
          data.jwks_uri ||
          new URL('/.well-known/jwks.json', issuerUrl).toString();
        return {
          issuer: data.issuer || issuerUrl,
          tokenEndpoint,
          jwksUri,
          clientId,
          clientSecret,
        };
      } catch {
        return {
          issuer: issuerUrl,
          tokenEndpoint: new URL('/oauth/token', issuerUrl).toString(),
          jwksUri: new URL('/.well-known/jwks.json', issuerUrl).toString(),
          clientId,
          clientSecret,
        };
      }
    })();
  }
  return configPromise;
}

async function getJwkSet(jwksUri: string) {
  if (!jwkSet) {
    jwkSet = createRemoteJWKSet(new URL(jwksUri));
  }
  return jwkSet;
}

export interface OidcProfile {
  sub: string;
  tenantId: string;
  groups: string[];
  acr?: string;
}

export async function loginWithOidc(
  username: string,
  password: string,
): Promise<OidcProfile> {
  const config = await getConfig();
  const params = new URLSearchParams();
  params.set('grant_type', 'password');
  params.set('username', username);
  params.set('password', password);
  params.set('scope', 'openid profile groups tenant');
  try {
    const response = await axios.post(config.tokenEndpoint, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      auth: {
        username: config.clientId,
        password: config.clientSecret,
      },
    });
    const idToken = response.data?.id_token as string | undefined;
    if (!idToken) {
      throw new Error('invalid_credentials');
    }
    const keySet = await getJwkSet(config.jwksUri);
    const { payload } = await jwtVerify(idToken, keySet, {
      issuer: config.issuer,
      audience: config.clientId,
    });
    const tenantId =
      (payload.tenant as string) || (payload['tenant_id'] as string);
    if (!tenantId) {
      throw new Error('tenant_missing');
    }
    return {
      sub: String(payload.sub),
      tenantId,
      groups: Array.isArray(payload.groups)
        ? (payload.groups as string[])
        : typeof payload.groups === 'string'
          ? [payload.groups]
          : [],
      acr: payload.acr as string | undefined,
    };
  } catch {
    throw new Error('invalid_credentials');
  }
}

export function resetOidcClient() {
  configPromise = undefined;
  jwkSet = undefined;
}
