import axios from 'axios';
import { createPublicKey, randomUUID } from 'crypto';
import { decode, JwtHeader, JwtPayload, verify } from 'jsonwebtoken';
import logger from '../utils/logger.js';

export interface AuthProviderConfig {
  id: string;
  name: string;
  issuer: string;
  jwksUri: string;
  audiences: string[];
  clientId?: string;
  groupsClaim?: string;
  defaultTenant?: string;
}

export interface ExternalAuthUser {
  id: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  providerId: string;
  providerName: string;
  tenant: string;
  roles: string[];
  groups: string[];
  scopes: string[];
  residency: string;
  issuedAt?: number;
  expiresAt?: number;
  claims: Record<string, any>;
}

interface CachedJWKS {
  keys: any[];
  expiresAt: number;
}

const DEFAULT_ROLE_MAPPINGS: Record<string, string[]> = {
  'IntelGraph-Admins': ['ADMIN'],
  'IntelGraph-Analysts': ['ANALYST'],
  'IntelGraph-Operators': ['OPERATOR'],
  'IntelGraph-Viewers': ['VIEWER'],
  'Okta-SOC-Admins': ['ADMIN'],
  'Okta-SOC-Analysts': ['ANALYST'],
  'Okta-SOC-Operators': ['OPERATOR'],
  'Okta-SOC-Viewers': ['VIEWER'],
  'azure-intelgraph-admin': ['ADMIN'],
  'azure-intelgraph-analyst': ['ANALYST'],
  'azure-intelgraph-operator': ['OPERATOR'],
  'azure-intelgraph-viewer': ['VIEWER'],
};

const SUPPORTED_ALGS = ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'];

let singletonManager: ExternalAuthManager | null = null;

export function getExternalAuthManager(): ExternalAuthManager {
  if (!singletonManager) {
    singletonManager = new ExternalAuthManager(loadAuthProviders(), loadRoleMappings());
  }
  return singletonManager;
}

export function resetExternalAuthManager(): void {
  singletonManager = null;
}

function loadRoleMappings(): Record<string, string[]> {
  try {
    const raw = process.env.AUTH_ROLE_MAPPINGS;
    if (!raw) {
      return DEFAULT_ROLE_MAPPINGS;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_ROLE_MAPPINGS,
      ...parsed,
    };
  } catch (error) {
    logger.warn('Failed to parse AUTH_ROLE_MAPPINGS. Falling back to defaults.', {
      error: (error as Error).message,
    });
    return DEFAULT_ROLE_MAPPINGS;
  }
}

function loadAuthProviders(): AuthProviderConfig[] {
  const requested = (process.env.AUTH_PROVIDERS || '')
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  const providers: AuthProviderConfig[] = [];
  const include = (id: string) => requested.length === 0 || requested.includes(id);
  const defaultTenant = process.env.AUTH_DEFAULT_TENANT || 'default';

  if (include('oidc') && process.env.OIDC_ISSUER) {
    const issuer = process.env.OIDC_ISSUER;
    const jwksUri = process.env.OIDC_JWKS_URI || `${issuer.replace(/\/$/, '')}/.well-known/jwks.json`;
    const audience = process.env.OIDC_AUDIENCE || process.env.OIDC_CLIENT_ID;

    providers.push({
      id: 'oidc',
      name: 'OIDC',
      issuer,
      jwksUri,
      audiences: audience ? [audience] : [],
      clientId: process.env.OIDC_CLIENT_ID,
      groupsClaim: process.env.OIDC_GROUPS_CLAIM || 'groups',
      defaultTenant,
    });
  }

  if (include('okta') && process.env.OKTA_ISSUER) {
    const issuer = process.env.OKTA_ISSUER.replace(/\/$/, '');
    const jwksUri = process.env.OKTA_JWKS_URI || `${issuer}/v1/keys`;
    const audience = process.env.OKTA_AUDIENCE || process.env.OKTA_CLIENT_ID;

    providers.push({
      id: 'okta',
      name: 'Okta',
      issuer,
      jwksUri,
      audiences: audience ? [audience] : [],
      clientId: process.env.OKTA_CLIENT_ID,
      groupsClaim: process.env.OKTA_GROUPS_CLAIM || 'groups',
      defaultTenant,
    });
  }

  if (include('azure') && (process.env.AZURE_AD_ISSUER || process.env.AZURE_AD_TENANT_ID)) {
    const tenantId = process.env.AZURE_AD_TENANT_ID;
    const issuer = process.env.AZURE_AD_ISSUER || (tenantId ? `https://login.microsoftonline.com/${tenantId}/v2.0` : undefined);
    if (issuer) {
      const normalizedIssuer = issuer.replace(/\/$/, '');
      const jwksUri = process.env.AZURE_AD_JWKS_URI || `${normalizedIssuer.replace(/\/v2\.0$/, '')}/discovery/v2.0/keys`;
      const audience = process.env.AZURE_AD_AUDIENCE || process.env.AZURE_AD_CLIENT_ID;

      providers.push({
        id: 'azure',
        name: 'Azure AD',
        issuer: normalizedIssuer,
        jwksUri,
        audiences: audience ? [audience] : [],
        clientId: process.env.AZURE_AD_CLIENT_ID,
        groupsClaim: process.env.AZURE_AD_GROUPS_CLAIM || 'groups',
        defaultTenant: tenantId || defaultTenant,
      });
    }
  }

  if (providers.length === 0) {
    logger.warn('No external auth providers configured. Only internal JWT authentication will be available.');
  } else {
    logger.info('Configured external authentication providers', {
      providers: providers.map((provider) => provider.id),
    });
  }

  return providers;
}

export class ExternalAuthManager {
  private providers: AuthProviderConfig[];
  private jwksCache: Map<string, CachedJWKS> = new Map();
  private roleMappings: Record<string, string[]>;
  private defaultTenant: string;

  constructor(providers: AuthProviderConfig[], roleMappings: Record<string, string[]>) {
    this.providers = providers;
    this.roleMappings = roleMappings;
    this.defaultTenant = process.env.AUTH_DEFAULT_TENANT || 'default';
  }

  async verify(token: string): Promise<ExternalAuthUser | null> {
    if (!token) {
      return null;
    }

    const decoded = decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      return null;
    }

    const header = decoded.header as JwtHeader;
    const payload = decoded.payload as JwtPayload & Record<string, any>;

    const provider = this.resolveProvider(payload);
    if (!provider) {
      logger.debug('Token issuer not mapped to a configured provider', {
        issuer: payload.iss,
        audience: payload.aud,
      });
      return null;
    }

    try {
      const publicKey = await this.getSigningKey(provider, header);
      const verified = verify(token, publicKey, {
        algorithms: header.alg && SUPPORTED_ALGS.includes(header.alg) ? [header.alg] : SUPPORTED_ALGS,
        issuer: provider.issuer,
        audience: provider.audiences.length > 0 ? provider.audiences : undefined,
      }) as JwtPayload & Record<string, any>;

      return this.mapToUser(provider, header, verified);
    } catch (error) {
      logger.warn('External token verification failed', {
        provider: provider.id,
        error: (error as Error).message,
      });
      return null;
    }
  }

  private resolveProvider(payload: JwtPayload & Record<string, any>): AuthProviderConfig | undefined {
    const issuer = (payload.iss as string | undefined)?.replace(/\/$/, '');
    const audClaim = payload.aud;
    const audiences: string[] = Array.isArray(audClaim)
      ? audClaim.map((value) => String(value))
      : audClaim
        ? [String(audClaim)]
        : [];

    return this.providers.find((provider) => {
      if (issuer && provider.issuer === issuer) {
        return true;
      }
      if (audiences.length > 0 && provider.audiences.some((aud) => audiences.includes(aud))) {
        return true;
      }
      return false;
    });
  }

  private async getSigningKey(provider: AuthProviderConfig, header: JwtHeader): Promise<string> {
    if (!header.kid) {
      throw new Error('Token missing kid header');
    }

    const jwks = await this.loadJWKS(provider);
    const key = jwks.keys.find((candidate) => candidate.kid === header.kid);
    if (!key) {
      throw new Error(`Unable to find signing key for kid ${header.kid}`);
    }

    const keyObject = createPublicKey({
      key,
      format: 'jwk',
    });
    return keyObject.export({ type: 'spki', format: 'pem' }).toString();
  }

  private async loadJWKS(provider: AuthProviderConfig): Promise<{ keys: any[] }> {
    const cached = this.jwksCache.get(provider.id);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return { keys: cached.keys };
    }

    const response = await axios.get(provider.jwksUri, {
      timeout: 5000,
    });
    const data = response.data;
    if (!data || !Array.isArray(data.keys)) {
      throw new Error(`JWKS endpoint ${provider.jwksUri} did not return keys`);
    }

    this.jwksCache.set(provider.id, {
      keys: data.keys,
      expiresAt: now + 10 * 60 * 1000,
    });

    return { keys: data.keys };
  }

  private mapToUser(
    provider: AuthProviderConfig,
    header: JwtHeader,
    payload: JwtPayload & Record<string, any>,
  ): ExternalAuthUser {
    const groupsClaim = provider.groupsClaim || 'groups';
    const groups = this.extractGroups(payload, groupsClaim);
    const roles = this.mapGroupsToRoles(groups);
    const scopes = this.extractScopes(payload);
    const tenant = this.resolveTenant(payload, provider);

    const name = payload.name as string | undefined;
    const givenName = (payload.given_name || payload.firstName) as string | undefined;
    const familyName = (payload.family_name || payload.lastName) as string | undefined;

    return {
      id: (payload.sub as string) || randomUUID(),
      email: (payload.email as string) || (payload.preferred_username as string),
      name,
      firstName: givenName,
      lastName: familyName,
      providerId: provider.id,
      providerName: provider.name,
      tenant,
      roles,
      groups,
      scopes,
      residency: (payload.residency as string) || (payload.country as string) || 'unknown',
      issuedAt: payload.iat,
      expiresAt: payload.exp,
      claims: {
        ...payload,
        alg: header.alg,
      },
    };
  }

  private extractGroups(payload: Record<string, any>, claim: string): string[] {
    const raw = payload[claim];
    if (!raw) {
      return [];
    }
    if (Array.isArray(raw)) {
      return raw.map((value) => String(value));
    }
    if (typeof raw === 'string') {
      return raw.split(',').map((value) => value.trim()).filter(Boolean);
    }
    return [];
  }

  private mapGroupsToRoles(groups: string[]): string[] {
    const roles = new Set<string>();
    for (const group of groups) {
      const mapped = this.roleMappings[group];
      if (mapped) {
        mapped.forEach((role) => roles.add(role));
      }
    }

    if (roles.size === 0) {
      roles.add('VIEWER');
    }

    return Array.from(roles);
  }

  private extractScopes(payload: Record<string, any>): string[] {
    if (Array.isArray(payload.scope)) {
      return payload.scope.map((value: any) => String(value));
    }

    if (typeof payload.scope === 'string') {
      return payload.scope.split(' ').map((value) => value.trim()).filter(Boolean);
    }

    if (Array.isArray(payload.scp)) {
      return payload.scp.map((value: any) => String(value));
    }

    if (typeof payload.scp === 'string') {
      return payload.scp.split(' ').map((value) => value.trim()).filter(Boolean);
    }

    if (Array.isArray(payload.roles)) {
      return payload.roles.map((value: any) => `role:${value}`);
    }

    return [];
  }

  private resolveTenant(payload: Record<string, any>, provider: AuthProviderConfig): string {
    return (
      (payload.tenant as string) ||
      (payload.tid as string) ||
      provider.defaultTenant ||
      this.defaultTenant ||
      'default'
    );
  }
}
