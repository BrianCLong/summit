"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultJwtSecretsProvider = void 0;
const rotation_js_1 = require("../rotation.js");
class VaultJwtSecretsProvider {
    name = 'vault-jwt';
    options;
    httpClient;
    tokenCache;
    constructor(options) {
        this.options = options;
        this.httpClient =
            options.httpClient ??
                (async (url, init) => {
                    const response = await fetch(url, {
                        method: init?.body ? 'POST' : 'GET',
                        headers: init?.headers,
                        body: init?.body,
                    });
                    return {
                        status: response.status,
                        json: () => response.json(),
                    };
                });
    }
    supports(ref) {
        return ref.vault !== undefined;
    }
    async getJwt() {
        if (typeof this.options.jwt === 'function') {
            const token = await this.options.jwt();
            if (!token) {
                throw new Error('JWT provider returned an empty token');
            }
            return token;
        }
        return this.options.jwt;
    }
    async fetchToken() {
        const jwt = await this.getJwt();
        const response = await this.httpClient(`${this.options.baseUrl}/v1/auth/jwt/login`, {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role: this.options.role,
                jwt,
            }),
        });
        const payload = (await response.json());
        const token = payload.auth?.client_token;
        const leaseDuration = payload.auth?.lease_duration ?? 0;
        if (!token) {
            throw new Error('Vault JWT login did not return a client token');
        }
        const expiryMs = Date.now() + Math.max(leaseDuration - 5, 0) * 1000;
        this.tokenCache = { token, expiresAt: expiryMs };
        return token;
    }
    async getToken() {
        if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
            return this.tokenCache.token;
        }
        return this.fetchToken();
    }
    assertVaultRef(ref) {
        if (!this.supports(ref)) {
            throw new Error('VaultJwtSecretsProvider only handles vault references');
        }
        return ref;
    }
    buildPath(ref) {
        const mount = this.options.mount ?? 'secret';
        const cleanPath = ref.vault.replace(/^vault:\/\//, '');
        return `${this.options.baseUrl}/v1/${mount}/data/${cleanPath}`;
    }
    async readSecret(ref) {
        const token = await this.getToken();
        const response = await this.httpClient(this.buildPath(ref), {
            headers: { 'X-Vault-Token': token },
        });
        if (response.status >= 400) {
            throw new Error(`Vault returned HTTP ${response.status}`);
        }
        const payload = (await response.json());
        const value = payload.data?.data?.[ref.key];
        const version = payload.data?.metadata?.version?.toString();
        if (value === undefined) {
            throw new Error(`Vault secret key ${ref.key} not found at ${ref.vault}`);
        }
        return {
            provider: this.name,
            value: String(value),
            version,
            rotation: (0, rotation_js_1.rotationStatusForRef)(ref),
        };
    }
    async getSecret(ref) {
        const vaultRef = this.assertVaultRef(ref);
        return this.readSecret(vaultRef);
    }
    async rotateSecret(ref) {
        const vaultRef = this.assertVaultRef(ref);
        this.tokenCache = undefined;
        const secret = await this.readSecret(vaultRef);
        return { ...secret, rotation: (0, rotation_js_1.rotationStatusForRef)(vaultRef) };
    }
    describeRotation(ref) {
        return (0, rotation_js_1.rotationStatusForRef)(this.assertVaultRef(ref));
    }
}
exports.VaultJwtSecretsProvider = VaultJwtSecretsProvider;
