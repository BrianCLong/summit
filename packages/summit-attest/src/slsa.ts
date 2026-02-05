export function generateSLSAPredicate(runId: string, runUri: string, manifestDigest: string) {
  return {
    _type: "https://in-toto.io/Statement/v1",
    subject: [], // Filled by cosign
    predicateType: "https://slsa.dev/provenance/v1",
    predicate: {
      buildDefinition: {
        buildType: "https://summit.dev/buildtypes/summit-ci/v1",
        externalParameters: {
          openlineage: {
            runId: runId,
            runUri: runUri
          }
        },
        internalParameters: {
          runManifestDigest: manifestDigest
        }
      },
      runDetails: {
        builder: {
          id: "https://summit.dev/builders/summit-ci/v1"
        }
      }
    }
  };
}
