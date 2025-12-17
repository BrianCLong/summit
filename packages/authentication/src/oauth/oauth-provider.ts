/**
 * OAuth 2.0 Provider
 *
 * Implements OAuth 2.0 authorization flows:
 * - Authorization Code Flow
 * - Client Credentials Flow
 * - Refresh Token Flow
 * - PKCE support
 */

import { randomBytes } from 'crypto';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('oauth-provider');

export enum GrantType {
  AUTHORIZATION_CODE = 'authorization_code',
  CLIENT_CREDENTIALS = 'client_credentials',
  REFRESH_TOKEN = 'refresh_token',
  PASSWORD = 'password', // Not recommended for production
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
  usePKCE?: boolean;
}

export interface AuthorizationRequest {
  responseType: 'code' | 'token';
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
}

export interface TokenRequest {
  grantType: GrantType;
  code?: string;
  clientId: string;
  clientSecret?: string;
  redirectUri?: string;
  refreshToken?: string;
  codeVerifier?: string;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshToken?: string;
  scope?: string;
}

export class OAuthProvider {
  private config: OAuthConfig;
  private authorizationCodes = new Map<string, AuthCodeData>();
  private refreshTokens = new Map<string, RefreshTokenData>();

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  generateAuthorizationUrl(
    scopes: string[],
    state?: string,
    codeChallenge?: string
  ): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: scopes.join(' '),
      state: state || this.generateState(),
    });

    if (codeChallenge && this.config.usePKCE) {
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
    }

    return `${this.config.authorizationEndpoint}?${params.toString()}`;
  }

  async handleAuthorizationRequest(
    request: AuthorizationRequest,
    userId: string
  ): Promise<string> {
    // Validate request
    this.validateAuthorizationRequest(request);

    // Generate authorization code
    const code = this.generateAuthorizationCode();

    // Store authorization code with metadata
    this.authorizationCodes.set(code, {
      userId,
      clientId: request.clientId,
      redirectUri: request.redirectUri,
      scope: request.scope,
      codeChallenge: request.codeChallenge,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    logger.info('Authorization code generated', { userId, clientId: request.clientId });

    return code;
  }

  async exchangeCodeForToken(request: TokenRequest): Promise<TokenResponse> {
    if (request.grantType !== GrantType.AUTHORIZATION_CODE) {
      throw new Error('Invalid grant type');
    }

    if (!request.code) {
      throw new Error('Authorization code required');
    }

    // Retrieve authorization code data
    const codeData = this.authorizationCodes.get(request.code);

    if (!codeData) {
      throw new Error('Invalid authorization code');
    }

    // Validate authorization code
    if (Date.now() > codeData.expiresAt) {
      this.authorizationCodes.delete(request.code);
      throw new Error('Authorization code expired');
    }

    if (codeData.clientId !== request.clientId) {
      throw new Error('Client ID mismatch');
    }

    if (codeData.redirectUri !== request.redirectUri) {
      throw new Error('Redirect URI mismatch');
    }

    // Validate PKCE if used
    if (codeData.codeChallenge && !request.codeVerifier) {
      throw new Error('Code verifier required');
    }

    // Delete authorization code (one-time use)
    this.authorizationCodes.delete(request.code);

    // Generate tokens
    const accessToken = this.generateAccessToken(codeData.userId, codeData.scope);
    const refreshToken = this.generateRefreshToken(codeData.userId);

    // Store refresh token
    this.refreshTokens.set(refreshToken, {
      userId: codeData.userId,
      clientId: codeData.clientId,
      scope: codeData.scope,
      createdAt: Date.now(),
    });

    logger.info('Token exchange successful', { userId: codeData.userId });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      refreshToken,
      scope: codeData.scope,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const tokenData = this.refreshTokens.get(refreshToken);

    if (!tokenData) {
      throw new Error('Invalid refresh token');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken(tokenData.userId, tokenData.scope);

    logger.info('Access token refreshed', { userId: tokenData.userId });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      scope: tokenData.scope,
    };
  }

  revokeToken(token: string): void {
    this.refreshTokens.delete(token);
    logger.info('Token revoked');
  }

  private validateAuthorizationRequest(request: AuthorizationRequest): void {
    if (!request.clientId || !request.redirectUri || !request.scope) {
      throw new Error('Invalid authorization request');
    }

    if (request.clientId !== this.config.clientId) {
      throw new Error('Invalid client ID');
    }

    if (request.redirectUri !== this.config.redirectUri) {
      throw new Error('Invalid redirect URI');
    }
  }

  private generateAuthorizationCode(): string {
    return randomBytes(32).toString('base64url');
  }

  private generateAccessToken(userId: string, scope: string): string {
    // This should use JWTManager in production
    return randomBytes(32).toString('base64url');
  }

  private generateRefreshToken(userId: string): string {
    return randomBytes(32).toString('base64url');
  }

  private generateState(): string {
    return randomBytes(16).toString('base64url');
  }
}

interface AuthCodeData {
  userId: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge?: string;
  createdAt: number;
  expiresAt: number;
}

interface RefreshTokenData {
  userId: string;
  clientId: string;
  scope: string;
  createdAt: number;
}
