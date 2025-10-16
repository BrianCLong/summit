export type SLO = {
  service: string;
  p95Ms: number;
  p99Ms?: number;
  errorRate: number;
  window: string;
};
export type Cost = {
  graphqlPerMillionUsd?: number;
  ingestPerThousandUsd?: number;
};

export async function readSloSnapshot(service: string): Promise<SLO> {
  // TODO replace with metrics scrape; stubbed
  return { service, p95Ms: 320, p99Ms: 800, errorRate: 0.01, window: '15m' };
}

export async function readUnitCosts(): Promise<Cost> {
  // TODO compute from usage + billing; stubbed
  return { graphqlPerMillionUsd: 1.8, ingestPerThousandUsd: 0.08 };
}
