import { User } from '../contexts/AuthContext';

export interface OIDCConfig {
  authority: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  responseType: string;
  postLogoutRedirectUri?: string;
}

export interface TokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
}

export interface UserInfo {
  sub: string;
  email: string;
  name?: string;
  groups?: string[];
  preferred_username?: string;
  'custom:tenant'?: string;
  'custom:tenants'?: string[];
  'custom:roles'?: string[];
}

class OIDCService {
  private config: OIDCConfig;
  private codeVerifier: string | null = null;

  constructor() {
    // Load configuration from environment or default values
    this.config = {
      authority:
        process.env.VITE_OIDC_AUTHORITY || 'https://dev-maestro.auth0.com',
      clientId: process.env.VITE_OIDC_CLIENT_ID || 'maestro-conductor-dev',
      redirectUri: `${window.location.origin}/auth/callback`,
      scope: 'openid profile email groups',
      responseType: 'code',
      postLogoutRedirectUri: `${window.location.origin}/auth/logout`,
    };
  }

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) =>
      ('0' + byte.toString(16)).slice(-2),
    ).join('');
  }

  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  async initiateLogin(provider?: 'auth0' | 'azure' | 'google'): Promise<void> {
    try {
      // Generate PKCE parameters
      this.codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);

      // Store code verifier for token exchange
      sessionStorage.setItem('oidc_code_verifier', this.codeVerifier);
      sessionStorage.setItem(
        'oidc_state',
        crypto.getRandomValues(new Uint8Array(16)).join(''),
      );

      // Build authorization URL
      const authUrl = new URL(`${this.config.authority}/authorize`);
      authUrl.searchParams.set('client_id', this.config.clientId);
      authUrl.searchParams.set('response_type', this.config.responseType);
      authUrl.searchParams.set('scope', this.config.scope);
      authUrl.searchParams.set('redirect_uri', this.config.redirectUri);
      authUrl.searchParams.set(
        'state',
        sessionStorage.getItem('oidc_state') || '',
      );
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');

      // Add provider hint if specified
      if (provider) {
        authUrl.searchParams.set('connection', provider);
      }

      // Redirect to authorization server
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('Failed to initiate OIDC login:', error);
      throw error;
    }
  }

  async handleCallback(): Promise<{ user: User; tokens: TokenResponse }> {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const storedState = sessionStorage.getItem('oidc_state');
      const codeVerifier = sessionStorage.getItem('oidc_code_verifier');

      if (!code) {
        throw new Error('Authorization code not found in callback');
      }

      if (state !== storedState) {
        throw new Error('Invalid state parameter');
      }

      if (!codeVerifier) {
        throw new Error('Code verifier not found');
      }

      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(code, codeVerifier);

      // Get user info
      const userInfo = await this.getUserInfo(tokens.access_token);

      // Map to internal User format
      const user = this.mapUserInfo(userInfo);

      // Clean up session storage
      sessionStorage.removeItem('oidc_code_verifier');
      sessionStorage.removeItem('oidc_state');

      return { user, tokens };
    } catch (error) {
      console.error('Failed to handle OIDC callback:', error);
      throw error;
    }
  }

  private async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
  ): Promise<TokenResponse> {
    const response = await fetch(`${this.config.authority}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        code,
        redirect_uri: this.config.redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Token exchange failed: ${error.error_description || error.error}`,
      );
    }

    return response.json();
  }

  private async getUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch(`${this.config.authority}/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    return response.json();
  }

  private mapUserInfo(userInfo: UserInfo): User {
    return {
      id: userInfo.sub,
      email: userInfo.email,
      roles: userInfo['custom:roles'] || userInfo.groups || ['viewer'],
      tenant: userInfo['custom:tenant'] || 'default',
      tenants: userInfo['custom:tenants'] || [
        userInfo['custom:tenant'] || 'default',
      ],
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch(`${this.config.authority}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Token refresh failed: ${error.error_description || error.error}`,
      );
    }

    return response.json();
  }

  async logout(accessToken?: string): Promise<void> {
    const logoutUrl = new URL(`${this.config.authority}/v2/logout`);
    logoutUrl.searchParams.set('client_id', this.config.clientId);
    if (this.config.postLogoutRedirectUri) {
      logoutUrl.searchParams.set('returnTo', this.config.postLogoutRedirectUri);
    }

    // Clear local storage
    localStorage.removeItem('maestro_auth_token');
    sessionStorage.clear();

    // Redirect to logout endpoint
    window.location.href = logoutUrl.toString();
  }

  validateToken(token: string): { valid: boolean; claims?: any; exp?: number } {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false };
      }

      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);

      return {
        valid: payload.exp > now,
        claims: payload,
        exp: payload.exp * 1000, // Convert to milliseconds
      };
    } catch (error) {
      return { valid: false };
    }
  }
}

export const oidcService = new OIDCService();
