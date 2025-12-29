/**
 * SSO Types for SAML and OIDC providers
 */

export interface SSOConfig {
  type: 'saml' | 'oidc';
  issuer: string;
  issuerString?: string;
  clientId?: string;
  clientSecret?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userInfoEndpoint?: string;
  jwksUri?: string;
  entryPoint?: string; // SAML
  cert?: string; // SAML certificate
  privateKey?: string;
  decryptionPvk?: string;
  signatureAlgorithm?: string;
  callbackUrl?: string;
  logoutUrl?: string;
  scope?: string[];
  claims?: Record<string, string>;
  groupMap?: Record<string, string[]>;
  attributeMap?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    groups?: string;
  };
}

export interface SSOUser {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  groups?: string[];
  roles?: string[];
  attributes?: Record<string, unknown>;
  provider?: string;
}

export interface SSOProvider {
  generateAuthUrl(callbackUrl: string, state?: string): Promise<string>;
  handleCallback(callbackUrl: string, body: unknown, query: unknown): Promise<SSOUser>;
  validateToken?(token: string): Promise<SSOUser>;
  getLogoutUrl?(returnUrl: string): string;
}

export interface SamlConfig {
  entryPoint: string;
  issuer: string;
  cert: string;
  callbackUrl: string;
  privateKey?: string;
  decryptionPvk?: string;
  signatureAlgorithm?: string;
  digestAlgorithm?: string;
  wantAssertionsSigned?: boolean;
  wantAuthnResponseSigned?: boolean;
}

export class SAML {
  constructor(_config: SamlConfig) {}

  getAuthorizeUrl(_options: { RelayState?: string }): string {
    throw new Error('SAML library not implemented');
  }

  validatePostResponse(_body: { SAMLResponse: string }): Promise<{ profile: Record<string, unknown> }> {
    throw new Error('SAML library not implemented');
  }

  validatePostResponseAsync(_request: { body: unknown }): Promise<{ profile: Record<string, unknown> }> {
    throw new Error('SAML library not implemented');
  }
}
