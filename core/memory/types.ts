export type Purpose = "assist" | "billing" | "debug" | "compliance";

export interface MemoryFacet {
  key: string;
  value: any;
}

export interface MemoryRecord {
  id: string;
  userId: string;
  content: string; // Encrypted blob (hex or base64)
  facets: MemoryFacet[];
  purpose: Purpose;
  contextSpace: string; // e.g., "work:acme", "personal", "health"
  sources: string[];
  createdAt: number;
  expiresAt: number;
  visibility: "user" | "system";
  accessPolicy?: string;
}

export interface MemoryScope {
  userId: string;
  purpose: Purpose;
  contextSpace: string;
}

export interface MemoryPolicyDecision {
  allow: boolean;
  reason: string;
}
