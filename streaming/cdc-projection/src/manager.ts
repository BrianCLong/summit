import { EventEmitter } from 'events';

interface CDCSourceConfig {
  sourceId: string;
  host: string;
}

interface CDCSource extends EventEmitter {
  slotName: string;
}

interface ProjectionHandler {
  name: string;
  handle(change: any): Promise<void>;
}

async function writeScopedEvidence(evidence: any): Promise<void> {
  // Mock evidence writer
}

export class CDCManager {
  private sources: Map<string, CDCSource> = new Map();
  private projections: Map<string, ProjectionHandler> = new Map();

  async createSource(config: CDCSourceConfig): Promise<CDCSource> {
    const source = new EventEmitter() as unknown as CDCSource;
    source.slotName = 'mock_slot';
    return source;
  }

  async addSource(config: CDCSourceConfig): Promise<void> {
    const source = await this.createSource(config);
    this.sources.set(config.sourceId, source);

    // Write evidence of source registration
    await writeScopedEvidence({
      operation: 'cdc.source.register',
      inputs: { sourceId: config.sourceId, dbHost: config.host },
      outputs: { status: 'active', slotName: source.slotName },
    });
  }

  async registerProjection(
    sourceId: string,
    projection: ProjectionHandler
  ): Promise<void> {
    const key = `${sourceId}:${projection.name}`;
    this.projections.set(key, projection);

    // Start consuming changes
    const source = this.sources.get(sourceId);
    if (source) {
      source.on('change', async (change) => {
        await projection.handle(change);
      });
    }
  }
}
