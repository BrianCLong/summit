"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZeroTrustSecretsManager = void 0;
const rotation_js_1 = require("./rotation.js");
class ZeroTrustSecretsManager {
    providers;
    constructor(providers = []) {
        this.providers = [...providers];
    }
    register(provider) {
        this.providers.push(provider);
    }
    supports(ref) {
        return this.providers.some((candidate) => candidate.supports(ref));
    }
    requireProvider(ref) {
        const provider = this.providers.find((candidate) => candidate.supports(ref));
        if (!provider) {
            throw new Error(`No secrets provider registered for ${ref.provider ?? 'vault'}`);
        }
        return provider;
    }
    async resolve(ref) {
        const provider = this.requireProvider(ref);
        const resolution = await provider.getSecret(ref);
        if (!resolution.rotation) {
            resolution.rotation = (0, rotation_js_1.rotationStatusForRef)(ref);
        }
        return resolution;
    }
    async rotate(ref) {
        const provider = this.requireProvider(ref);
        if (!provider.rotateSecret) {
            throw new Error(`Provider ${provider.name} does not support rotation`);
        }
        const resolution = await provider.rotateSecret(ref);
        if (!resolution.rotation) {
            resolution.rotation = (0, rotation_js_1.rotationStatusForRef)(ref);
        }
        return resolution;
    }
    describeRotation(ref, now = new Date()) {
        const provider = this.providers.find((candidate) => candidate.supports(ref));
        if (provider?.describeRotation) {
            return provider.describeRotation(ref);
        }
        return (0, rotation_js_1.rotationStatusForRef)(ref, now);
    }
}
exports.ZeroTrustSecretsManager = ZeroTrustSecretsManager;
