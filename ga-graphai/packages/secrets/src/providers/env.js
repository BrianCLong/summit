"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentSecretsProvider = void 0;
const rotation_js_1 = require("../rotation.js");
function buildEnvKey(ref, prefix) {
    return prefix ? `${prefix}${ref.env}` : ref.env;
}
class EnvironmentSecretsProvider {
    name = 'env';
    options;
    constructor(options = {}) {
        this.options = options;
    }
    supports(ref) {
        return ref.env !== undefined || ref.provider === 'env';
    }
    assertEnvRef(ref) {
        if (!this.supports(ref)) {
            throw new Error('EnvironmentSecretsProvider only handles env references');
        }
        return ref;
    }
    async delegate(ref) {
        if (!this.options.fallbackProviders || this.options.fallbackProviders.length === 0) {
            return null;
        }
        for (const provider of this.options.fallbackProviders) {
            if (!provider.supports(ref))
                continue;
            return provider.getSecret(ref);
        }
        return null;
    }
    async getSecret(ref) {
        const envRef = this.assertEnvRef(ref);
        const envKey = buildEnvKey(envRef, this.options.prefix);
        const value = process.env[envKey];
        if (value !== undefined && value !== '') {
            return {
                provider: this.name,
                value,
                version: envRef.version ?? envRef.kid ?? envRef.key,
                rotation: (0, rotation_js_1.rotationStatusForRef)(envRef),
                metadata: envRef.kid ? { kid: envRef.kid } : undefined,
            };
        }
        const delegated = envRef.allowFallback ? await this.delegate(ref) : null;
        if (delegated) {
            return delegated;
        }
        throw new Error(`Environment variable ${envKey} is not set for ${envRef.key}`);
    }
    async rotateSecret(ref) {
        const envRef = this.assertEnvRef(ref);
        const resolution = await this.getSecret(envRef);
        return {
            ...resolution,
            rotation: (0, rotation_js_1.rotationStatusForRef)(envRef),
        };
    }
    describeRotation(ref) {
        return (0, rotation_js_1.rotationStatusForRef)(this.assertEnvRef(ref));
    }
}
exports.EnvironmentSecretsProvider = EnvironmentSecretsProvider;
