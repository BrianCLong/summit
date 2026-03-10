import { CitationRecord } from "./citationRecord";
import { GraphEvidenceLink } from "../linking/linkTypes";
import { TrustScore } from "./trustScore";

export interface EvidenceEnvelope {
  evidenceId: string;
  sourceType: string;
  sourceId: string;
  locator: string;
  contentHash: string;
  normalizedText: string;
  citation: CitationRecord;
  links: GraphEvidenceLink[];
  trust: TrustScore;
}
