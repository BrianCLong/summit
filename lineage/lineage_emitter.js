"use strict";
/**
 * Lineage Emitter
 * Consumes Postgres NOTIFY events from 'lineage_events' and emits OpenLineage artifacts.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitLineage = emitLineage;
const pg_1 = __importDefault(require("pg"));
const { Client } = pg_1.default;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
async function startEmitter() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });
    await client.connect();
    await client.query('LISTEN lineage_events');
    client.on('notification', async (msg) => {
        if (msg.channel === 'lineage_events' && msg.payload) {
            const event = JSON.parse(msg.payload);
            await emitLineage(event);
        }
    });
    console.log('Lineage emitter listening for events...');
}
async function emitLineage(dbEvent) {
    const runId = dbEvent.id || crypto.randomUUID();
    const lineageEvent = {
        eventType: 'COMPLETE',
        eventTime: new Date().toISOString(),
        run: { runId },
        job: {
            namespace: 'summit.postgres',
            name: `outbox.${dbEvent.topic}`
        },
        producer: 'https://github.com/BrianCLong/summit/lineage-emitter',
        inputs: [{
                namespace: 'summit.postgres',
                name: 'outbox_events',
                facets: {
                    aggregate: {
                        type: dbEvent.aggregate_type,
                        id: dbEvent.aggregate_id
                    }
                }
            }]
    };
    const artifactPath = node_path_1.default.join(process.cwd(), 'artifacts/lineage', `${runId}.json`);
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(artifactPath), { recursive: true });
    node_fs_1.default.writeFileSync(artifactPath, JSON.stringify(lineageEvent, null, 2));
    console.log(`Emitted lineage event: ${artifactPath}`);
}
if (import.meta.url === `file://${process.argv[1]}`) {
    startEmitter().catch(console.error);
}
