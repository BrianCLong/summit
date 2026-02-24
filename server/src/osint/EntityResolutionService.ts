
import { OSINTProfile } from './types';
import { Entity } from '../data-model/types';
import crypto from 'crypto';

export class EntityResolutionService {

  // In-memory mock database for demo purposes
  // In a real system, this would query Postgres/Neo4j/Elasticsearch
  private static existingProfiles: OSINTProfile[] = [];

  async resolve(profile: Partial<OSINTProfile>): Promise<OSINTProfile | null> {
    // 1. Check for exact match on external refs (e.g. email, social handle)
    // 2. Check for fuzzy match on name + location/company

    // Simple implementation: Check if any existing profile has a matching name or handle
    // In production, use Vector Search or specialized Record Linkage

    const nameToMatch = profile.properties?.name as string;

    // Check match by name (simplified) AND tenant isolation
    const match = EntityResolutionService.existingProfiles.find(p => {
        if (p.tenantId !== profile.tenantId) return false;

        const pName = p.properties.name as string;
        return pName && nameToMatch && pName.toLowerCase() === nameToMatch.toLowerCase();
    });

    return match || null;
  }

  merge(existing: OSINTProfile, incoming: Partial<OSINTProfile>): OSINTProfile {
    // Logic to merge incoming data into existing profile
    // - Union sets of social profiles
    // - Update lastEnrichedAt
    // - Merge properties (prefer incoming if newer, or based on confidence)

    const merged: OSINTProfile = {
      ...existing,
      ...incoming,
      id: existing.id, // Keep existing ID
      properties: {
        ...existing.properties,
        ...(incoming.properties || {})
      },
      externalRefs: [
        ...existing.externalRefs,
        ...(incoming.externalRefs || []).filter(ref =>
          !existing.externalRefs.some(e => e.system === ref.system && e.id === ref.id)
        )
      ],
      socialProfiles: this.mergeLists(existing.socialProfiles, incoming.socialProfiles, 'url'),
      corporateRecords: this.mergeLists(existing.corporateRecords, incoming.corporateRecords, 'companyName'), // weak key but sufficient for mock
      publicRecords: [...existing.publicRecords, ...(incoming.publicRecords || [])],
      updatedAt: new Date().toISOString(),
      lastEnrichedAt: new Date().toISOString()
    };

    return merged;
  }

  private mergeLists<T>(listA: T[] | undefined, listB: T[] | undefined, key: keyof T): T[] {
    const map = new Map<any, T>();
    (listA || []).forEach(item => map.set(item[key], item));
    (listB || []).forEach(item => map.set(item[key], item)); // Overwrite with B
    return Array.from(map.values());
  }

  // Helper to "save" or register a profile (mock persistence)
  async save(profile: OSINTProfile): Promise<OSINTProfile> {
    const index = EntityResolutionService.existingProfiles.findIndex(p => p.id === profile.id);
    if (index >= 0) {
      EntityResolutionService.existingProfiles[index] = profile;
    } else {
      EntityResolutionService.existingProfiles.push(profile);
    }
    return profile;
  }
}
