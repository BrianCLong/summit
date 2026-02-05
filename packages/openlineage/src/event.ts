export interface SummitProvenanceFacet {
  _schemaURL: string;
  runManifest: {
    sha256: string;
  };
  attestations: Array<{
    uri: string;
    digest: {
      sha256: string;
    };
    predicateType: string;
  }>;
}

export interface OpenLineageRun {
  runId: string;
  facets: {
    [key: string]: any;
    summit_provenance?: SummitProvenanceFacet;
  };
}

export interface OpenLineageEvent {
  eventType: 'START' | 'RUNNING' | 'COMPLETE' | 'FAIL' | 'OTHER';
  eventTime: string;
  run: OpenLineageRun;
  job: {
    namespace: string;
    name: string;
  };
  inputs?: any[];
  outputs?: any[];
}
