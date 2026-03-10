export interface CitationRecord {
  sourceName: string;
  locator: string;
  retrievedVia: string;
  verificationStatus: "verified" | "unverified" | "failed";
}
