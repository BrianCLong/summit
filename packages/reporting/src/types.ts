export type Report = {
  schema_version: string;
  case_id: string;
  claims_used: string[];
  evidence_cids: string[];
  sections: Array<{
    title: string;
    statements: Array<{ text: string; claim_cids: string[] }>;
  }>;
};

export type VerifiedClaimSurface = {
  claim_cid: string;
  evidence_cids: string[];
  verified: true;
};
