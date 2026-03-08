// @ts-nocheck
import { BaseConnector } from '../connectors/base.js';
import { BaseEnricher } from '../ingest/enrichers/base.js';
import { IngestionEvent } from '../connectors/types.js';
import { ProvenanceLedgerV2 } from '../provenance/ledger.js';
import { EventEmitter } from 'events';
import { Readable } from 'stream';

// Mock DB/Graph destination
export interface Destination {
    write(event: IngestionEvent, enrichedData: Record<string, any>): Promise<void>;
}

export class MockGraphDestination implements Destination {
    async write(event: IngestionEvent, enrichedData: Record<string, any>): Promise<void> {
        // console.log('Writing to graph:', event.id);
    }
}

export class ETLPipeline extends EventEmitter {
    private connector: BaseConnector;
    private enrichers: BaseEnricher[];
    private destination: Destination;
    private ledger: ProvenanceLedgerV2;
    private config: any;

    constructor(
        connector: BaseConnector,
        enrichers: BaseEnricher[],
        destination: Destination,
        ledger: ProvenanceLedgerV2,
        config: any = {}
    ) {
        super();
        this.connector = connector;
        this.enrichers = enrichers;
        this.destination = destination;
        this.ledger = ledger;
        this.config = config;
    }

    async run(): Promise<void> {
        try {
            await this.connector.connect();
            const stream = await this.connector.readStream();

            for await (const event of stream) {
                await this.processEvent(event as IngestionEvent);
            }
        } catch (err: any) {
            this.emit('error', err);
            throw err;
        } finally {
            await this.connector.disconnect();
        }
    }

    private async processEvent(event: IngestionEvent): Promise<void> {
        try {
            // 1. Enrichment
            let enrichedData = { ...event.data };
            let enrichmentMetadata = {};

            for (const enricher of this.enrichers) {
                const result = await enricher.enrich(event);
                enrichedData = { ...enrichedData, ...result.enrichedData };
                enrichmentMetadata = { ...enrichmentMetadata, ...result.metadata };
            }

            // 2. Register Provenance
            // We use the ledger instance passed in.
            // Note: In real system, this might be batched.
            await this.ledger.appendEntry({
                tenantId: this.config.tenantId || 'default',
                actionType: 'ingest',
                resourceType: 'data_record',
                resourceId: event.id,
                actorId: 'system-etl-pipeline',
                actorType: 'system',
                timestamp: new Date(),
                payload: {
                    sourceId: event.sourceId,
                    ingestTimestamp: event.timestamp,
                    enrichmentMetadata
                },
                metadata: {
                    connectorType: event.provenance.connectorType
                }
            });

            // 3. Write to Destination (Graph/Canonical Model)
            await this.destination.write(event, enrichedData);

            this.emit('eventProcessed', event.id);

        } catch (err: any) {
            this.emit('eventError', { eventId: event.id, error: err });
            // Should we stop or continue? configured policy.
            // For now log and continue
        }
    }
}
