import { RetrievalAdapter } from "../adapters/types";

export interface SourceMetadata {
  id: string;
  tenantId: string;
  modality: "vector" | "keyword" | "graph";
  trustScore: number;
  description?: string;
}

export class SourceRegistry {
  private sources = new Map<string, SourceMetadata>();
  private adapters = new Map<string, RetrievalAdapter>();

  register(metadata: SourceMetadata, adapter: RetrievalAdapter) {
    this.sources.set(metadata.id, metadata);
    this.adapters.set(metadata.id, adapter);
  }

  getMetadata(sourceId: string): SourceMetadata | undefined {
    return this.sources.get(sourceId);
  }

  getAdapter(sourceId: string): RetrievalAdapter | undefined {
    return this.adapters.get(sourceId);
  }

  getAllSources(): SourceMetadata[] {
    return Array.from(this.sources.values());
  }
}
