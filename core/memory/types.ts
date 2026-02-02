export type Purpose = "assist" | "billing" | "debug" | "compliance" | "research";

export interface MemoryScope {
  userId: string;
  purpose: Purpose;
  contextSpace: string; // e.g., "work:acme", "personal", "health"
}

export interface MemoryRecord {
  id: string;
  userId: string;
  content: string; // Should be encrypted in real storage
  facets: Record<string, any>; // typed key-value; e.g., preference, profile, project
  purpose: Purpose;
  contextSpace: string;
  sources: string[]; // chat/tool/upload; minimal provenance
  createdAt: number;
  expiresAt: number; // TTL
  visibility: "user" | "system"; // default "user"
  accessPolicy?: string; // who/what can retrieve
}

export interface MemoryPolicyDecision {
  allow: boolean;
  reason: string;
}
