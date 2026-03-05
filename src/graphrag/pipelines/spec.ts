export type PipelineMaterialization = "batch" | "stream";

export interface DeclarativeDataset {
  name: string;
  source: string;
  schema: Record<string, string>;
  constraints?: string[];
}

export interface DeclarativePipeline {
  id: string;
  version: string;
  datasets: DeclarativeDataset[];
  dependencies: string[];
  materialization: PipelineMaterialization;
}
