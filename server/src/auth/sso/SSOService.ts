import { SSOProvider, SSOUserIdentity } from './types.ts';
import { LocalStubProvider } from './providers/LocalStubProvider.ts';
// Correct named import for AuthService based on review (although file has default export too, named import is safer if mixed)
// Wait, checking AuthService.ts content: "export class AuthService ... export default AuthService;"
// So strict named import `import { AuthService }` works, and default works too.
// I will use named import to match my test expectation and best practice.
import { AuthService } from '../../services/AuthService.ts';
import logger from '../../utils/logger.ts';
import { ProvenanceLedgerV2 } from '../../provenance/ledger.js';

export class SSOService {
  private providers: Map<string, SSOProvider> = new Map();
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
    this.registerProvider(new LocalStubProvider());
  }

  registerProvider(provider: SSOProvider) {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): SSOProvider | undefined {
    return this.providers.get(name);
  }

  async getAllProviders() {
    return Promise.all(
      Array.from(this.providers.values()).map(p => p.metadata())
    );
  }

  async handleLogin(providerName: string, redirectUri: string): Promise<{ url: string }> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    const state = Math.random().toString(36).substring(7);
    const { url } = await provider.authenticate(redirectUri, state);
    return { url };
  }

  async handleCallback(providerName: string, params: Record<string, string>, redirectUri: string) {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    try {
      const identity = await provider.callback(params, redirectUri);
      const authResponse = await this.bindIdentity(identity);

      // Extract correlationId if available (assumed from context or passed, here we don't have it easily in params unless passed in state)
      // Ideally correlationId comes from request headers, but this method signature doesn't take request.
      // I should update signature or just log "unknown".
      // But logging is important.

      // Audit success via Logger (and potentially Ledger if fully integrated)
      logger.info({
         event: 'sso_login_success',
         provider: providerName,
         userId: authResponse.user.id,
         tenantId: authResponse.user.defaultTenantId
      }, 'SSO Login Success');

      return authResponse;
    } catch (error: any) {
       logger.error({ error: error.message, provider: providerName }, 'SSO Callback failed');
       throw error;
    }
  }

  private async bindIdentity(identity: SSOUserIdentity) {
    // Enforce MFA if required by assertion
    if (identity.mfaVerified === false) {
       // Check if user/tenant policy requires MFA.
       // For now, if identity explicitly says "mfaVerified: false", we treat it as a risk.
       // However, many providers might not send this field.
       // Requirement: "Enforce MFA-required claim support (if present in assertions)"
       // So if present and false, we block? Or if present and true, we accept?
       // Let's assume if it is explicitly false, we block.
       throw new Error('MFA required but not verified by provider');
    }

    try {
        const authResponse = await this.authService.externalLogin(identity.email);
        return authResponse;
    } catch (err: any) {
        if (err.message === 'User not found') {
            throw new Error('User account not found. Please contact your administrator.');
        }
        throw err;
    }
  }
}
