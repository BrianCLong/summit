import { SSOProvider, SSOMetadata, SSOUserIdentity } from '../types.js';

export class LocalStubProvider implements SSOProvider {
  name = 'local-stub';

  async authenticate(redirectUri: string, state?: string): Promise<{ url: string; state: string }> {
    // In a real provider, this would point to the IdP.
    // For the stub, we redirect back to our callback with a dummy code.
    const url = new URL(redirectUri);
    url.searchParams.set('code', 'stub_code_123');
    if (state) url.searchParams.set('state', state);
    return { url: url.toString(), state: state || '' };
  }

  async callback(params: Record<string, string>, redirectUri: string): Promise<SSOUserIdentity> {
    if (params.code !== 'stub_code_123') {
      throw new Error('Invalid stub code');
    }

    // Return a fixed identity for testing
    return {
      provider: this.name,
      providerId: 'stub-user-1',
      email: 'sso-user@example.com',
      emailVerified: true,
      firstName: 'Stub',
      lastName: 'User',
      mfaVerified: true, // Simulate MFA
    };
  }

  async metadata(): Promise<SSOMetadata> {
    return {
      provider: this.name,
      loginUrl: '/auth/sso/local-stub/login',
    };
  }
}
