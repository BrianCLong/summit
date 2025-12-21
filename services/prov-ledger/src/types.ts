export type Lineage = { field: string; source: string };

export type EvidenceMetadata = {
  licenseTags: string[];
  lineage: Lineage[];
};

export type Evidence = {
  id: string;
  hash: string;
  metadata: EvidenceMetadata;
};

export type Claim = {
  id: string;
  evidenceIds: string[];
  statement: string;
};

export type Manifest = {
  id: string;
  merkleRoot: string;
  createdAt: string;
  licenseTags: string[];
  lineage: Lineage[];
};
