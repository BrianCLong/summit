/**
 * OpenID Connect (OIDC) Support
 *
 * Extends OAuth 2.0 with identity layer
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('oidc');

export interface OIDCConfig {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  jwksUri: string;
  supportedScopes: string[];
  supportedClaims: string[];
}

export interface UserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  updated_at?: number;
}

export interface IDToken {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  nonce?: string;
  auth_time?: number;
  acr?: string;
  amr?: string[];
  azp?: string;
}

export class OIDCProvider {
  private config: OIDCConfig;
  private userInfoStore = new Map<string, UserInfo>();

  constructor(config: OIDCConfig) {
    this.config = config;
  }

  async getUserInfo(accessToken: string): Promise<UserInfo | null> {
    // In production, validate access token and fetch user info from database
    const userInfo = this.userInfoStore.get(accessToken);

    if (!userInfo) {
      logger.warn('User info not found for token');
      return null;
    }

    return userInfo;
  }

  storeUserInfo(userId: string, userInfo: UserInfo): void {
    this.userInfoStore.set(userId, userInfo);
    logger.info('User info stored', { sub: userInfo.sub });
  }

  getDiscoveryDocument() {
    return {
      issuer: this.config.issuer,
      authorization_endpoint: this.config.authorizationEndpoint,
      token_endpoint: this.config.tokenEndpoint,
      userinfo_endpoint: this.config.userinfoEndpoint,
      jwks_uri: this.config.jwksUri,
      scopes_supported: this.config.supportedScopes,
      claims_supported: this.config.supportedClaims,
      response_types_supported: ['code', 'token', 'id_token', 'code token', 'code id_token', 'token id_token', 'code token id_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256', 'HS256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    };
  }
}
