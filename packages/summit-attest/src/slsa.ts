import { RunManifest } from './manifest.js';

/**
 * Generates a SLSA v1 Provenance predicate content.
 * See: https://slsa.dev/provenance/v1
 * Note: Returns only the predicate object, as cosign attest wraps it into a Statement.
 */
export function createSlsaPredicate(manifest: RunManifest, buildType: string) {
  return {
    buildDefinition: {
      buildType: buildType,
      externalParameters: {
        openlineage: {
          runId: manifest.runId,
          runUri: manifest.runUri,
        },
      },
      internalParameters: {
        nominalTime: manifest.nominalTime,
      },
      resolvedDependencies: [
        ...manifest.inputs.map((input) => ({
          uri: `openlineage://${input.namespace}/datasets/${input.name}`,
          digest: input.digest ? { sha256: input.digest } : undefined,
        })),
      ],
    },
    runDetails: {
      // Additional run info can go here
    },
  };
}
