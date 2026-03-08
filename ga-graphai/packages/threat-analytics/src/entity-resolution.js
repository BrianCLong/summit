"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityResolver = void 0;
class EntityResolver {
    canonicalByAlias = new Map();
    profiles = new Map();
    registerProfile(profile) {
        this.profiles.set(profile.id, profile);
        for (const alias of profile.aliases ?? []) {
            this.canonicalByAlias.set(alias, profile.id);
        }
    }
    resolve(event) {
        const canonicalId = this.canonicalByAlias.get(event.entityId) ?? event.entityId;
        const profile = this.profiles.get(canonicalId);
        if (!profile) {
            return { ...event, entityId: canonicalId };
        }
        const mergedAttributes = {
            ...profile.attributes,
            ...event.attributes,
        };
        return {
            ...event,
            entityId: canonicalId,
            attributes: mergedAttributes,
        };
    }
    enrichEntity(id, attributes) {
        const profile = this.profiles.get(id);
        if (!profile) {
            return undefined;
        }
        const updatedProfile = {
            ...profile,
            attributes: { ...profile.attributes, ...attributes },
        };
        this.profiles.set(id, updatedProfile);
        return updatedProfile;
    }
    listProfiles() {
        return Array.from(this.profiles.values());
    }
}
exports.EntityResolver = EntityResolver;
