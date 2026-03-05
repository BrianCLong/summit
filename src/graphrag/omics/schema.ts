export interface OmicsSample {
  id: string;
  modality: "transcriptome" | "proteome" | "metabolome";
  features: Record<string, number>;
}
