export type OidcProviderRegistrationRequest = {
  tenantId: string;
  issuerUrl: string;
  clientId: string;
  clientSecretRef: string;
  redirectUris: string[];
  scopes: string[];
  signingAlgorithm: 'RS256' | 'ES256';
};

export type OidcProviderRegistrationResponse = {
  tenantId: string;
  issuerUrl: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
  logoutEndpoint?: string;
  status: 'registered';
  metadata: Record<string, string>;
};

export type ScimProvisioningRequest = {
  tenantId: string;
  baseUrl: string;
  bearerTokenRef: string;
  userSyncSchedule: string;
  groupSyncSchedule: string;
  userFilter?: string;
};

export type ScimProvisioningResponse = {
  tenantId: string;
  integrationId: string;
  status: 'configured';
  endpoints: {
    users: string;
    groups: string;
    serviceProviderConfig: string;
  };
};

/**
 * Stubbed identity provisioning contracts for OIDC + SCIM.
 *
 * OIDC Registration Request (example):
 * {
 *   "tenantId": "tenant-123",
 *   "issuerUrl": "https://login.example.com",
 *   "clientId": "summit-client",
 *   "clientSecretRef": "vault://identity/oidc/summit-client",
 *   "redirectUris": ["https://summit.example.com/auth/callback"],
 *   "scopes": ["openid", "profile", "email", "groups"],
 *   "signingAlgorithm": "RS256"
 * }
 *
 * OIDC Registration Response (example):
 * {
 *   "tenantId": "tenant-123",
 *   "issuerUrl": "https://login.example.com",
 *   "authorizationEndpoint": "https://login.example.com/oauth2/v2/auth",
 *   "tokenEndpoint": "https://login.example.com/oauth2/v2/token",
 *   "jwksUri": "https://login.example.com/oauth2/v2/keys",
 *   "logoutEndpoint": "https://login.example.com/logout",
 *   "status": "registered",
 *   "metadata": { "prompt": "login", "acr_values": "urn:mace:incommon:iap:silver" }
 * }
 *
 * SCIM Provisioning Request (example):
 * {
 *   "tenantId": "tenant-123",
 *   "baseUrl": "https://idp.example.com/scim/v2",
 *   "bearerTokenRef": "vault://identity/scim/token",
 *   "userSyncSchedule": "0 0,4,8,12,16,20 * * *",
 *   "groupSyncSchedule": "15 0,6,12,18 * * *",
 *   "userFilter": "active eq true"
 * }
 *
 * SCIM Provisioning Response (example):
 * {
 *   "tenantId": "tenant-123",
 *   "integrationId": "scim_7f2c1e",
 *   "status": "configured",
 *   "endpoints": {
 *     "users": "https://idp.example.com/scim/v2/Users",
 *     "groups": "https://idp.example.com/scim/v2/Groups",
 *     "serviceProviderConfig": "https://idp.example.com/scim/v2/ServiceProviderConfig"
 *   }
 * }
 */
export class IdentityProvisioningService {
  async registerOidcProvider(
    request: OidcProviderRegistrationRequest,
  ): Promise<OidcProviderRegistrationResponse> {
    return {
      tenantId: request.tenantId,
      issuerUrl: request.issuerUrl,
      authorizationEndpoint: `${request.issuerUrl}/oauth2/v2/auth`,
      tokenEndpoint: `${request.issuerUrl}/oauth2/v2/token`,
      jwksUri: `${request.issuerUrl}/oauth2/v2/keys`,
      logoutEndpoint: `${request.issuerUrl}/logout`,
      status: 'registered',
      metadata: {
        signingAlgorithm: request.signingAlgorithm,
        scopes: request.scopes.join(' '),
      },
    };
  }

  async registerScimIntegration(
    request: ScimProvisioningRequest,
  ): Promise<ScimProvisioningResponse> {
    return {
      tenantId: request.tenantId,
      integrationId: `scim_${Math.random().toString(36).slice(2, 8)}`,
      status: 'configured',
      endpoints: {
        users: `${request.baseUrl}/Users`,
        groups: `${request.baseUrl}/Groups`,
        serviceProviderConfig: `${request.baseUrl}/ServiceProviderConfig`,
      },
    };
  }
}
