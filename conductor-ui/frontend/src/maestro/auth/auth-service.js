/**
 * Production-ready OIDC Authentication Service
 * Implements OpenID Connect Authorization Code Flow with PKCE
 */
export class AuthService {
  constructor(config) {
    this.storagePrefix = 'maestro_auth_';
    this.config = config;
  }
  // PKCE helpers
  generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  async generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(
      String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  generateNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)));
  }
  // Storage helpers
  setItem(key, value) {
    try {
      localStorage.setItem(`${this.storagePrefix}${key}`, value);
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }
  getItem(key) {
    try {
      return localStorage.getItem(`${this.storagePrefix}${key}`);
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }
  removeItem(key) {
    try {
      localStorage.removeItem(`${this.storagePrefix}${key}`);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }
  // JWT helpers
  parseJWT(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to parse JWT:', error);
      return null;
    }
  }
  isTokenExpired(token) {
    const payload = this.parseJWT(token);
    if (!payload || !payload.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }
  // Authentication flow
  async login() {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const nonce = this.generateNonce();
    const state = btoa(
      JSON.stringify({
        timestamp: Date.now(),
        returnUrl: window.location.pathname,
      }),
    );
    // Store PKCE parameters
    this.setItem('code_verifier', codeVerifier);
    this.setItem('nonce', nonce);
    this.setItem('state', state);
    const params = new URLSearchParams({
      response_type: this.config.responseType,
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    if (this.config.responseMode) {
      params.append('response_mode', this.config.responseMode);
    }
    const authUrl = `${this.config.issuer}/auth?${params.toString()}`;
    window.location.href = authUrl;
  }
  async handleCallback(callbackUrl) {
    const url = new URL(callbackUrl);
    const urlParams = new URLSearchParams(url.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    if (error) {
      throw new Error(
        `Authentication failed: ${error}. ${errorDescription || ''}`,
      );
    }
    if (!code || !state) {
      throw new Error('Invalid callback parameters');
    }
    // Verify state
    const storedState = this.getItem('state');
    if (state !== storedState) {
      throw new Error('Invalid state parameter');
    }
    // Exchange code for tokens
    const codeVerifier = this.getItem('code_verifier');
    if (!codeVerifier) {
      throw new Error('Missing code verifier');
    }
    const tokens = await this.exchangeCodeForTokens(code, codeVerifier);
    return this.processTokens(tokens);
  }
  async exchangeCodeForTokens(code, codeVerifier) {
    const tokenEndpoint = `${this.config.issuer}/token`;
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      code,
      redirect_uri: this.config.redirectUri,
      code_verifier: codeVerifier,
    });
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Token exchange failed: ${errorData.error || response.statusText}`,
      );
    }
    return response.json();
  }
  async processTokens(tokens) {
    // Validate ID token if present
    if (tokens.id_token) {
      const idTokenPayload = this.parseJWT(tokens.id_token);
      const storedNonce = this.getItem('nonce');
      if (idTokenPayload.nonce !== storedNonce) {
        throw new Error('Invalid nonce in ID token');
      }
      if (this.isTokenExpired(tokens.id_token)) {
        throw new Error('ID token is expired');
      }
    }
    // Store tokens
    this.setItem('access_token', tokens.access_token);
    if (tokens.refresh_token) {
      this.setItem('refresh_token', tokens.refresh_token);
    }
    if (tokens.id_token) {
      this.setItem('id_token', tokens.id_token);
    }
    // Clean up temporary storage
    this.removeItem('code_verifier');
    this.removeItem('nonce');
    this.removeItem('state');
    // Fetch user profile
    const user = await this.fetchUserProfile(tokens.access_token);
    return {
      isAuthenticated: true,
      isLoading: false,
      user,
      tenant: user.tenant
        ? {
            id: user.tenant,
            name: user.tenant,
            tier: 'standard',
            limits: {},
            users: [],
          }
        : null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      error: null,
    };
  }
  async fetchUserProfile(accessToken) {
    const userInfoEndpoint = `${this.config.issuer}/userinfo`;
    const response = await fetch(userInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }
    const userInfo = await response.json();
    return {
      id: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name || userInfo.preferred_username || userInfo.email,
      roles: userInfo.roles || userInfo['maestro:roles'] || ['user'],
      permissions:
        userInfo.permissions || userInfo['maestro:permissions'] || [],
      tenant: userInfo.tenant || userInfo['maestro:tenant'] || 'default',
    };
  }
  async refreshTokens() {
    const refreshToken = this.getItem('refresh_token');
    if (!refreshToken) {
      return null;
    }
    try {
      const tokenEndpoint = `${this.config.issuer}/token`;
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        refresh_token: refreshToken,
      });
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
      const tokens = await response.json();
      return this.processTokens(tokens);
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
      return null;
    }
  }
  async logout() {
    const accessToken = this.getItem('access_token');
    // Clear stored tokens
    this.removeItem('access_token');
    this.removeItem('refresh_token');
    this.removeItem('id_token');
    // Call logout endpoint if available
    if (accessToken) {
      try {
        const logoutEndpoint = `${this.config.issuer}/logout`;
        await fetch(logoutEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (error) {
        console.warn('Logout endpoint failed:', error);
      }
    }
    // Redirect to login
    const logoutUrl = `${this.config.issuer}/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`;
    window.location.href = logoutUrl;
  }
  getStoredAuthState() {
    const accessToken = this.getItem('access_token');
    if (!accessToken || this.isTokenExpired(accessToken)) {
      return null;
    }
    try {
      const tokenPayload = this.parseJWT(accessToken);
      const user = {
        id: tokenPayload.sub,
        email: tokenPayload.email,
        name:
          tokenPayload.name ||
          tokenPayload.preferred_username ||
          tokenPayload.email,
        roles: tokenPayload.roles || tokenPayload['maestro:roles'] || ['user'],
        permissions:
          tokenPayload.permissions || tokenPayload['maestro:permissions'] || [],
        tenant:
          tokenPayload.tenant || tokenPayload['maestro:tenant'] || 'default',
      };
      return {
        isAuthenticated: true,
        isLoading: false,
        user,
        tenant: user.tenant
          ? {
              id: user.tenant,
              name: user.tenant,
              tier: 'standard',
              limits: {},
              users: [],
            }
          : null,
        accessToken,
        refreshToken: this.getItem('refresh_token'),
        error: null,
      };
    } catch (error) {
      console.error('Failed to parse stored auth state:', error);
      return null;
    }
  }
  hasPermission(permission) {
    const authState = this.getStoredAuthState();
    return authState?.user?.permissions.includes(permission) || false;
  }
  hasRole(role) {
    const authState = this.getStoredAuthState();
    return authState?.user?.roles.includes(role) || false;
  }
}
