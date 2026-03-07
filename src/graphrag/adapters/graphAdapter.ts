import { RetrievalAdapter, FederatedHit } from "./types";

export class GraphAdapter implements RetrievalAdapter {
  constructor(
    public sourceId: string,
    public modality: "graph" = "graph"
  ) {}

  async search(query: string, k: number, tenantId: string): Promise<FederatedHit[]> {
    return [];
  }
}
