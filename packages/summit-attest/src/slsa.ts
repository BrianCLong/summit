export interface SLSAProvenanceParams {
  runId: string;
  runUri: string;
  builderId: string;
  manifestDigest: string;
  invocationId?: string;
}

/**
 * Generates a SLSA v1 provenance predicate.
 * Note: cosign attest --predicate wraps this in an in-toto Statement.
 */
export function generateSLSAPredicate(params: SLSAProvenanceParams) {
  return {
    buildDefinition: {
      buildType: "https://summit.dev/buildtypes/summit-ci/v1",
      externalParameters: {
        openlineage: {
          runId: params.runId,
          runUri: params.runUri
        },
        summit: {
          runManifestDigest: params.manifestDigest
        }
      },
      internalParameters: {
        builderId: params.builderId,
        invocationId: params.invocationId
      },
      resolvedDependencies: []
    },
    runDetails: {
      builder: {
        id: params.builderId
      },
      metadata: {
        invocationId: params.invocationId
      }
    }
  };
}
