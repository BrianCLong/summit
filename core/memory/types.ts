<<<<<<< HEAD
export type Purpose = "assist" | "billing" | "debug" | "compliance";

export interface MemoryFacet {
  key: string;
  value: any;
=======
export type Purpose = "assist" | "billing" | "debug" | "compliance" | "research";

export interface MemoryScope {
  userId: string;
  purpose: Purpose;
  contextSpace: string; // e.g., "work:acme", "personal", "health"
>>>>>>> origin/main
}

export interface MemoryRecord {
  id: string;
  userId: string;
<<<<<<< HEAD
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
=======
  content: string; // Should be encrypted in real storage
  facets: Record<string, any>; // typed key-value; e.g., preference, profile, project
  purpose: Purpose;
  contextSpace: string;
  sources: string[]; // chat/tool/upload; minimal provenance
  createdAt: number;
  expiresAt: number; // TTL
  visibility: "user" | "system"; // default "user"
  accessPolicy?: string; // who/what can retrieve
>>>>>>> origin/main
}

export interface MemoryPolicyDecision {
  allow: boolean;
  reason: string;
}
