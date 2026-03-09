import * as jose from 'jose';

export type TenantContext = {
  tenantId: string;
  roles: string[];
  subject?: string;
};

export type JwtClaims = Record<string, unknown> & {
  sub?: string;
  tid?: string;
  roles?: string[] | string;
  aud?: string | string[];
};

export async function verifyJwt(
  token: string,
  jwksUrl: string,
): Promise<JwtClaims> {
  const jwks = jose.createRemoteJWKSet(new URL(jwksUrl));
  const { payload } = await jose.jwtVerify(token, jwks);
  return payload as JwtClaims;
}
