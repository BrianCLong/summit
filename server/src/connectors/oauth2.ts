import crypto from 'crypto';
import { tokenVaultService, StoredOAuthTokens } from '../services/TokenVaultService.js';

export interface ConsentScreenMetadata {
  appName: string;
  supportEmail: string;
  termsUrl: string;
  privacyPolicyUrl?: string;
}

export interface OAuth2Config {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
  authorizationParams?: Record<string, string>;
  consentScreen?: ConsentScreenMetadata;
}

export interface OAuth2AuthorizationRequest {
  authorizationUrl: string;
  codeVerifier: string;
  state: string;
}

export interface OAuth2TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
  tokenType?: string;
}

export class OAuth2PKCEClient {
  constructor(
    private readonly config: OAuth2Config,
    private readonly vault = tokenVaultService,
  ) {}

  createAuthorizationRequest(
    state: string = crypto.randomUUID(),
    scopes: string[] = this.config.scopes,
  ): OAuth2AuthorizationRequest {
    const codeVerifier = this.createCodeVerifier();
    const codeChallenge = this.createCodeChallenge(codeVerifier);

    const url = new URL(this.config.authorizationEndpoint);
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', this.config.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('scope', scopes.join(' '));
    url.searchParams.set('state', state);

    if (this.config.authorizationParams) {
      Object.entries(this.config.authorizationParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    return {
      authorizationUrl: url.toString(),
      codeVerifier,
      state,
    };
  }

  async exchangeCode(
    connectionId: string,
    code: string,
    codeVerifier: string,
  ): Promise<OAuth2TokenResponse> {
    const payload = new URLSearchParams({
      client_id: this.config.clientId,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: this.config.redirectUri,
    });

    if (this.config.clientSecret) {
      payload.set('client_secret', this.config.clientSecret);
    }

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OAuth2 token exchange failed: ${errorText}`);
    }

    const data = await response.json();
    const expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;

    const tokens: StoredOAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      scope: data.scope,
      tokenType: data.token_type,
      refreshTokenRotatedAt: data.refresh_token ? new Date().toISOString() : undefined,
    };

    this.vault.storeTokens(connectionId, tokens);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
      tokenType: tokens.tokenType,
    };
  }

  async refreshTokens(connectionId: string): Promise<OAuth2TokenResponse> {
    const stored = this.vault.getTokens(connectionId);
    if (!stored?.refreshToken) {
      throw new Error('No refresh token available for rotation');
    }

    const payload = new URLSearchParams({
      client_id: this.config.clientId,
      refresh_token: stored.refreshToken,
      grant_type: 'refresh_token',
    });

    if (this.config.clientSecret) {
      payload.set('client_secret', this.config.clientSecret);
    }

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OAuth2 refresh failed: ${errorText}`);
    }

    const data = await response.json();
    const expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
    const refreshToken = data.refresh_token ?? stored.refreshToken;
    const refreshTokenRotatedAt =
      data.refresh_token && data.refresh_token !== stored.refreshToken
        ? new Date().toISOString()
        : stored.refreshTokenRotatedAt;

    const tokens: StoredOAuthTokens = {
      accessToken: data.access_token,
      refreshToken,
      expiresAt,
      scope: data.scope ?? stored.scope,
      tokenType: data.token_type ?? stored.tokenType,
      refreshTokenRotatedAt,
    };

    this.vault.rotateTokens(connectionId, tokens);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
      tokenType: tokens.tokenType,
    };
  }

  private createCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private createCodeChallenge(verifier: string): string {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
