import { RetrievalAdapter, FederatedHit } from "./types";

export class KeywordAdapter implements RetrievalAdapter {
  constructor(
    public sourceId: string,
    public modality: "keyword" = "keyword"
  ) {}

  async search(query: string, k: number, tenantId: string): Promise<FederatedHit[]> {
    return [];
  }
}
