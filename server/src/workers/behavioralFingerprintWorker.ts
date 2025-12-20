import { EntityResolutionService } from '../services/EntityResolutionService.js';
import { BehavioralTelemetry } from '../services/BehavioralFingerprintService.js';

interface IdentityInput {
  id: string;
  projectId: string;
  telemetry: BehavioralTelemetry[];
}

/**
 * Runs the behavioral fingerprinting job to resolve and cluster identities based on behavioral telemetry.
 *
 * @param identities - A list of identities with their behavioral telemetry data.
 * @returns An object containing generated fingerprints and identity clusters.
 */
export async function runBehavioralFingerprintJob(identities: IdentityInput[]) {
  const er = new EntityResolutionService();
  const fingerprints = identities.map((i) => {
    const { fingerprint, score } = er.fuseBehavioralFingerprint(i.telemetry);
    return { id: i.id, projectId: i.projectId, fingerprint, score };
  });
  const clusters = er.clusterIdentitiesAcrossProjects(identities);
  return { fingerprints, clusters };
}
