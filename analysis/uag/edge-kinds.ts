// analysis/uag/edge-kinds.ts
export const EdgeKinds = [
  "DEPENDS_ON",
  "BUILT_BY",
  "DESCRIBED_BY",
  "ATTESTED_BY",
  "VIOLATES",
  "AFFECTS",
  "DEPLOYED_TO",
  "REMEDIATED_BY",
  "DERIVES_FROM",
] as const;

export type EdgeKind = (typeof EdgeKinds)[number];
