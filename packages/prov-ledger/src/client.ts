import { Evidence, Claim, Manifest } from "./types";

export interface LedgerClient {
  registerEvidence(evidence: Omit<Evidence, "id" | "timestamp">): Promise<Evidence>;
  createClaim(claim: Omit<Claim, "id" | "timestamp" | "hash">): Promise<Claim>;
  getClaim(id: string): Promise<Claim | null>;
  generateManifest(claimIds: string[]): Promise<Manifest>;
}

// Example implementation wrapping fetch
export class HttpLedgerClient implements LedgerClient {
  constructor(private baseUrl: string) {}

  async registerEvidence(evidence: Omit<Evidence, "id" | "timestamp">): Promise<Evidence> {
    const res = await fetch(`${this.baseUrl}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(evidence),
    });
    if (!res.ok) {
      throw new Error("Failed to register evidence");
    }
    return res.json() as Promise<Evidence>;
  }

  async createClaim(claim: Omit<Claim, "id" | "timestamp" | "hash">): Promise<Claim> {
    const res = await fetch(`${this.baseUrl}/claims`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(claim),
    });
    if (!res.ok) {
      throw new Error("Failed to create claim");
    }
    return res.json() as Promise<Claim>;
  }

  async getClaim(id: string): Promise<Claim | null> {
    const res = await fetch(`${this.baseUrl}/claims/${id}`);
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw new Error("Failed to get claim");
    }
    return res.json() as Promise<Claim>;
  }

  async generateManifest(claimIds: string[]): Promise<Manifest> {
    const res = await fetch(`${this.baseUrl}/exports/manifest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimIds }),
    });
    if (!res.ok) {
      throw new Error("Failed to generate manifest");
    }
    return res.json() as Promise<Manifest>;
  }
}
