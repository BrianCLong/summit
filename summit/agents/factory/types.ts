export type EvidenceId = `EID:AF:${string}:${string}:${string}`;

export interface ClaimRef {
  id: string; // ITEM:CLAIM-01 | Summit original
}

export interface FactoryPlan {
  itemSlug: string;
  mws: string;
  workItems: Array<{
    id: string;
    title: string;
    ownedPaths: string[];
    claimRefs: ClaimRef[];
  }>;
}
