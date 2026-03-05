import { IngestRecord, ConnectorConfig } from '../types';

export abstract class Connector {
  protected config: ConnectorConfig;
  protected connected: boolean = false;

  constructor(config: ConnectorConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract fetchData(): AsyncGenerator<IngestRecord[], void, unknown>;
}
