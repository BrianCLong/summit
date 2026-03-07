import { RetrievalAdapter, FederatedHit } from "./types";

export class VectorAdapter implements RetrievalAdapter {
  constructor(
    public sourceId: string,
    public modality: "vector" = "vector"
  ) {}

  async search(query: string, k: number, tenantId: string): Promise<FederatedHit[]> {
    return [];
  }
}
