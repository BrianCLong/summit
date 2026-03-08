import type { IsoDateTime } from "./bitemporal.types";

export type Provenance = {
  producer: { kind: "human" | "agent" | "system"; id: string; display_name?: string };
  generated_at: IsoDateTime;
  pipeline: { name: string; version: string; model?: string; prompt_hash?: string; toolchain?: string[] };
  hashes: { writeset_sha256: string; artifact_sha256?: string };
  signatures?: Array<{ alg: string; kid?: string; sig: string }>;
};

export type Artifact = {
  artifact_id: string;
  kind: "doc" | "post" | "sensor" | "file" | "image";
  uri: string;
  observed_at: IsoDateTime;
  content_type?: string;
  sha256?: string;
};

export type Entity = {
  entity_id: string;
  label: string;
  kind: "person" | "org" | "place" | "asset" | "topic" | "unknown";
};

export type Claim = {
  claim_id: string;
  statement: string;
  topic?: string;
  valid_time: { start: IsoDateTime; end?: IsoDateTime | null };
  confidence: { score: number; method?: string; rationale?: string };
};

export type Link = {
  from: string;
  to: string;
  type: "supported_by" | "mentions_entity" | "member_of_narrative" | "updates_belief";
  weight?: number;
};

export type WriteSet = {
  writeset_id: string;
  tx_time: IsoDateTime;
  provenance: Provenance;
  artifacts: Artifact[];
  claims: Claim[];
  links: Link[];
  entities?: Entity[];
};
