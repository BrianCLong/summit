import fs from 'fs/promises';
import path from 'path';

async function ingestDemoData() {
    try {
        const datasetPath = path.resolve(process.cwd(), 'GOLDEN/datasets/fusion_demo.jsonl');

        console.log(`[Demo Ingest] Checking for dataset at: ${datasetPath}`);

        const exists = await fs.access(datasetPath).then(() => true).catch(() => false);

        if (!exists) {
            console.error('[Demo Ingest] Dataset not found! Make sure GOLDEN/datasets/fusion_demo.jsonl exists.');
            process.exit(1);
        }

        const data = await fs.readFile(datasetPath, 'utf-8');
        const lines = data.split('\n').filter(line => line.trim().length > 0);

        console.log(`[Demo Ingest] Found ${lines.length} records. Simulating mapping to Neo4j schema...`);

        for (let i = 0; i < Math.min(lines.length, 5); i++) {
            const record = JSON.parse(lines[i]);
            console.log(`[Demo Ingest] Processing record ID: ${record.id || record.title || 'Unknown'}`);
            // Explicitly simulated Neo4j query
            const simulatedQuery = `
MERGE (e:Entity {id: "${record.id || 'N/A'}"})
SET e.title = "${record.title || ''}", e.source = "${record.source || 'ingest-demo'}"
            `.trim();
            console.log(`  [Cypher] -> ${simulatedQuery.replace(/\n/g, ' ')}`);
        }

        console.log('[Demo Ingest] Simulation complete! Connect this to your neo4j-driver to execute live queries.');

    } catch (error) {
        console.error('[Demo Ingest] Error during simulated ingestion:', error);
    }
}

ingestDemoData();
