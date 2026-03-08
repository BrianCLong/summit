"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStubProvider = void 0;
class LocalStubProvider {
    name = 'local-stub';
    async authenticate(redirectUri, state) {
        // In a real provider, this would point to the IdP.
        // For the stub, we redirect back to our callback with a dummy code.
        const url = new URL(redirectUri);
        url.searchParams.set('code', 'stub_code_123');
        if (state)
            url.searchParams.set('state', state);
        return { url: url.toString(), state: state || '' };
    }
    async callback(params, redirectUri) {
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
    async metadata() {
        return {
            provider: this.name,
            loginUrl: '/auth/sso/local-stub/login',
        };
    }
}
exports.LocalStubProvider = LocalStubProvider;
