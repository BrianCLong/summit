"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapabilityRegistry = void 0;
class CapabilityRegistry {
    resources = new Map();
    register(resource) {
        this.resources.set(resource.profile.id, resource);
    }
    unregister(id) {
        this.resources.delete(id);
    }
    get(id) {
        return this.resources.get(id);
    }
    list() {
        return Array.from(this.resources.values());
    }
    eligible(policy) {
        return this.list().filter((resource) => this.satisfiesPolicy(resource.profile, policy));
    }
    satisfiesPolicy(profile, policy) {
        if (policy.residency &&
            profile.residency !== 'global' &&
            profile.residency !== policy.residency) {
            return false;
        }
        if (policy.pii && profile.safety === 'low') {
            return false;
        }
        if (policy.safetyTier === 'high' && profile.safety !== 'high') {
            return false;
        }
        return true;
    }
}
exports.CapabilityRegistry = CapabilityRegistry;
