export interface SSOMetadata {
  provider: string;
  loginUrl: string;
  // Other safe metadata
}

export interface SSOUserIdentity {
  provider: string;
  providerId: string;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  rawAttributes?: Record<string, any>;
  mfaVerified?: boolean;
}

export interface SSOSession {
  userId: string;
  tenantId: string;
  provider: string;
  sessionId: string;
}

export interface SSOProvider {
  name: string;
  /**
   * Generates the login URL and state for the provider.
   * @param redirectUri The callback URL to return to
   */
  authenticate(redirectUri: string, state?: string): Promise<{ url: string; state: string }>;

  /**
   * Handles the callback from the provider.
   * @param params Query parameters from the callback (code, state, etc.)
   * @param redirectUri The callback URL used
   */
  callback(params: Record<string, string>, redirectUri: string): Promise<SSOUserIdentity>;

  /**
   * Returns public metadata about the provider.
   */
  metadata(): Promise<SSOMetadata>;
}
