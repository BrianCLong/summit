"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ETLPipeline = exports.MockGraphDestination = void 0;
const events_1 = require("events");
class MockGraphDestination {
    async write(event, enrichedData) {
        // console.log('Writing to graph:', event.id);
    }
}
exports.MockGraphDestination = MockGraphDestination;
class ETLPipeline extends events_1.EventEmitter {
    connector;
    enrichers;
    destination;
    ledger;
    config;
    constructor(connector, enrichers, destination, ledger, config = {}) {
        super();
        this.connector = connector;
        this.enrichers = enrichers;
        this.destination = destination;
        this.ledger = ledger;
        this.config = config;
    }
    async run() {
        try {
            await this.connector.connect();
            const stream = await this.connector.readStream();
            for await (const event of stream) {
                await this.processEvent(event);
            }
        }
        catch (err) {
            this.emit('error', err);
            throw err;
        }
        finally {
            await this.connector.disconnect();
        }
    }
    async processEvent(event) {
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
        }
        catch (err) {
            this.emit('eventError', { eventId: event.id, error: err });
            // Should we stop or continue? configured policy.
            // For now log and continue
        }
    }
}
exports.ETLPipeline = ETLPipeline;
