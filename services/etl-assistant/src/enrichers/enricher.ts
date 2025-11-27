export interface Enricher {
  name: string;
  enrich(data: Record<string, any>): Promise<Record<string, any>>;
}
