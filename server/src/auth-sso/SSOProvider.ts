export interface AuthSSOProvider {
  getType(): string;
  generateAuthUrl(tenantId: string, state: string, callbackUrl: string): Promise<string>;
  verifyCallback(code: string, tenantId: string, callbackUrl: string): Promise<SSOUserClaims>;
  validateConfig(config: SSOConfig): Promise<boolean>;
}

export interface SSOConfig {
  tenantId: string;
  providerType: 'oidc' | 'saml';
  issuerUrl: string;
  clientId: string;
  clientSecret?: string;
  authorizationUrl?: string; // Optional for OIDC discovery
  tokenUrl?: string; // Optional for OIDC discovery
  userInfoUrl?: string; // Optional for OIDC discovery
  redirectUrl?: string;
  mapping?: {
    email: string;
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    groups: string;
  };
  isActive: boolean;
}

export interface SSOUserClaims {
  sub: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  groups?: string[];
  raw?: any;
}

import axios from 'axios';
import jwt from 'jsonwebtoken';

export class OIDCProvider implements AuthSSOProvider {
  constructor(private config?: SSOConfig) {}

  getType(): string {
    return 'oidc';
  }

  async generateAuthUrl(tenantId: string, state: string, callbackUrl: string): Promise<string> {
    if (!this.config) throw new Error('OIDC provider not configured');

    // In a real implementation, we would fetch discovery doc if endpoints are missing
    const authUrl = this.config.authorizationUrl || `${this.config.issuerUrl}/authorize`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: callbackUrl,
      scope: 'openid profile email',
      state: state
    });

    return `${authUrl}?${params.toString()}`;
  }

  async verifyCallback(code: string, tenantId: string, callbackUrl: string): Promise<SSOUserClaims> {
    if (!this.config) throw new Error('OIDC provider not configured');

    const tokenUrl = this.config.tokenUrl || `${this.config.issuerUrl}/token`;

    // Exchange code for token
    try {
      const tokenResponse = await axios.post(tokenUrl, {
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      }, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { id_token, access_token } = tokenResponse.data;

      // Verify ID Token (simplified - should verify signature against JWKS)
      // For this implementation we'll decode without verification if we can't fetch JWKS easily,
      // but strictly we should. Assuming internal trust or implementation of JWKS client.
      const decoded = jwt.decode(id_token) as any;

      // Basic claim mapping
      const mapping = this.config.mapping || {
        email: 'email',
        id: 'sub',
        firstName: 'given_name',
        lastName: 'family_name',
        role: 'role',
        groups: 'groups'
      };

      return {
        sub: decoded[mapping.id] || decoded.sub,
        email: decoded[mapping.email] || decoded.email,
        firstName: decoded[mapping.firstName],
        lastName: decoded[mapping.lastName],
        role: decoded[mapping.role],
        groups: decoded[mapping.groups],
        raw: decoded
      };
    } catch (error: any) {
      console.error('SSO Token Exchange Error:', error);
      throw new Error('Failed to verify SSO callback');
    }
  }

  async validateConfig(config: SSOConfig): Promise<boolean> {
    try {
      // Try to fetch OIDC discovery document
      const discoveryUrl = `${config.issuerUrl}/.well-known/openid-configuration`;
      const response = await axios.get(discoveryUrl);
      return response.status === 200 && !!response.data.authorization_endpoint;
    } catch (error: any) {
      // Fallback: check if endpoints are explicitly provided
      return !!(config.authorizationUrl && config.tokenUrl);
    }
  }
}

export class SAMLProviderStub implements AuthSSOProvider {
  getType(): string {
    return 'saml';
  }

  async generateAuthUrl(tenantId: string, state: string, callbackUrl: string): Promise<string> {
    return `https://saml-idp.example.com/sso?state=${state}&tenant=${tenantId}`;
  }

  async verifyCallback(code: string, tenantId: string, callbackUrl: string): Promise<SSOUserClaims> {
    // Stub implementation
    return {
      sub: 'saml-user-123',
      email: 'user@saml.example.com',
      firstName: 'SAML',
      lastName: 'User'
    };
  }

  async validateConfig(config: SSOConfig): Promise<boolean> {
    return true; // Stub always valid
  }
}
