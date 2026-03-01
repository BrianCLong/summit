export type TrustSummary = {
  env: "dev" | "staging" | "prod" | string;
  release: string; // semver or git sha
  updatedAt: string; // ISO
  overall: {
    status: "PASS" | "WARN" | "FAIL";
    score: number; // 0-100
    blockers: string[];
  };
  build: {
    reproducible: boolean;
    artifactSignedPct: number; // 0-100
    sbomPresentPct: number; // 0-100
    slsaLevel?: string; // e.g. "SLSA3"
  };
  provenance: {
    coveragePct: number;
    unsignedEvents24h: number;
    gapsTop: { component: string; reason: string }[];
  };
  policy: {
    compliancePct: number;
    denials24h: number;
    topDeniedActions: { action: string; count: number }[];
  };
  drift: {
    configDrift: boolean;
    driftItems: { key: string; expected: string; actual: string }[];
  };
  audit: {
    appendOnly: boolean;
    verifierHealthy: boolean;
    missingSpans24h: number;
  };
};
