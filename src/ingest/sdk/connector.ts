export interface ConnectorConfig {
  name: string;
  sourceUrl?: string;
}

export interface Connector {
  discover(): Promise<any[]>;
  fetch(target: any): Promise<any>;
  normalize(data: any): any;
  extract(data: any): any;
  load(data: any): Promise<void>;
}
