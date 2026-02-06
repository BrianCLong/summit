import { NarrativeIdentity } from '../schema/evidence_v1';
import { createHash } from 'crypto';

// Simple MWS implementation of persistent identity
export class NarrativeTracker {
  private identities: Map<string, NarrativeIdentity> = new Map();

  // "Fingerprint" here would be the structural + implication fingerprint
  getOrCreateIdentity(fingerprint: string, timestamp: string): NarrativeIdentity {
    // Check if close match exists (using exact match for MWS)
    // In full version, this would check similarity thresholds

    // Hash the fingerprint to get ID
    const id = `nid:${createHash('sha256').update(fingerprint).digest('hex').substring(0, 12)}`;

    if (this.identities.has(id)) {
      const identity = this.identities.get(id)!;
      identity.last_seen = timestamp;
      return identity;
    }

    const newIdentity: NarrativeIdentity = {
      narrative_id: id,
      first_seen: timestamp,
      last_seen: timestamp,
      mutation_log: []
    };

    this.identities.set(id, newIdentity);
    return newIdentity;
  }

  recordMutation(id: string, newFingerprint: string, timestamp: string) {
    const identity = this.identities.get(id);
    if (identity) {
      identity.mutation_log.push({
        timestamp,
        diff_hash: createHash('sha256').update(newFingerprint).digest('hex').substring(0, 8)
      });
    }
  }
}
