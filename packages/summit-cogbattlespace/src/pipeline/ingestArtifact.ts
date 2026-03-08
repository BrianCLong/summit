import { toRejectionReport, validators } from '@intelgraph/summit-schemas';
import type { CogBattleStorage } from '../storage';
import type { Artifact } from '../types';

export async function ingestArtifacts(
  store: CogBattleStorage,
  artifacts: Artifact[],
): Promise<void> {
  for (const artifact of artifacts) {
    const valid = validators.artifact(artifact);
    if (!valid) {
      const report = toRejectionReport(validators.artifact);
      throw new Error(`Artifact validation failed: ${JSON.stringify(report)}`);
    }
  }
  await store.putArtifacts(artifacts);
}
