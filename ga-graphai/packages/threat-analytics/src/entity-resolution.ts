import type { BehaviorEvent, EntityProfile } from './types';

export class EntityResolver {
  private readonly canonicalByAlias = new Map<string, string>();

  private readonly profiles = new Map<string, EntityProfile>();

  registerProfile(profile: EntityProfile): void {
    this.profiles.set(profile.id, profile);
    for (const alias of profile.aliases ?? []) {
      this.canonicalByAlias.set(alias, profile.id);
    }
  }

  resolve(event: BehaviorEvent): BehaviorEvent {
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

  enrichEntity(id: string, attributes: EntityProfile['attributes']): EntityProfile | undefined {
    const profile = this.profiles.get(id);
    if (!profile) {
      return undefined;
    }
    const updatedProfile = {
      ...profile,
      attributes: { ...profile.attributes, ...attributes },
    } satisfies EntityProfile;
    this.profiles.set(id, updatedProfile);
    return updatedProfile;
  }

  listProfiles(): EntityProfile[] {
    return Array.from(this.profiles.values());
  }
}
