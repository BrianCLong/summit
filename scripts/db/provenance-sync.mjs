// scripts/db/provenance-sync.mjs
// Extracts ProvSQL row-level lineage and converts it to Summit's JSON lineage format.

import pg from 'pg';
import fs from 'fs/promises';

const { Pool } = pg;

// Configuration
const CONFIG = {
  db: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:devpassword@localhost:5432/intelgraph_dev',
  },
  outputFile: process.env.OUTPUT_FILE || 'lineage-export.json',
};

async function main() {
  console.log('🔌 Connecting to database...');
  const pool = new Pool(CONFIG.db);

  try {
    // 1. Check if ProvSQL is active
    const extCheck = await pool.query(`SELECT 1 FROM pg_extension WHERE extname = 'provsql'`);
    if (extCheck.rowCount === 0) {
      console.warn('⚠️  ProvSQL extension not found. Lineage sync skipped.');
      process.exit(0);
    }

    // 2. Fetch Provenance Data
    // We get the analysis result and its provenance token
    // The token represents the unique derivation path for this row
    console.log('🔍 Extracting provenance tokens from analysis_results...');
    const query = `
      SELECT 
        id, 
        investigation_id, 
        analysis_type, 
        provenance() as prov_token 
      FROM analysis_results
      LIMIT 100;
    `;
    
    // Note: 'provenance()' is a ProvSQL function exposed on the table
    const result = await pool.query(query);

    if (result.rowCount === 0) {
      console.log('ℹ️  No analysis results found to extract.');
      return;
    }

    // 3. Transform to Summit Lineage Graph
    // Schema: Nodes (Data Entities), Edges (Derivation)
    const lineageGraph = {
      nodes: [],
      edges: [],
      metadata: {
        generatedAt: new Date().toISOString(),
        source: 'ProvSQL',
        scope: 'analysis_results'
      }
    };

    for (const row of result.rows) {
      const resultNodeId = `analysis:${row.id}`;
      
      // Node: The Analysis Result
      lineageGraph.nodes.push({
        id: resultNodeId,
        type: 'DATASET_ROW',
        label: `Analysis: ${row.analysis_type}`,
        properties: {
          investigationId: row.investigation_id,
          provToken: row.prov_token
        }
      });

      // Query the ProvSQL circuit to find the inputs (gates)
      // For a pilot, we just inspect the token property or upstream gates
      // In a full implementation, we would recursively traverse the circuit_wire table
      const circuitQuery = `
        SELECT * FROM provenance_evaluate(
          'probability', 
          '${row.prov_token}', 
          '0', 
          'probability'
        ) AS prob;
      `;
      
      // Placeholder: In a real ProvSQL setup, we'd map the token back to input rows
      // For now, we represent the "Unknown Upstream" derived from the token
      lineageGraph.nodes.push({
        id: `token:${row.prov_token}`,
        type: 'PROVENANCE_TOKEN',
        label: `Prov Token ${row.prov_token}`,
        properties: {
          token: row.prov_token
        }
      });

      lineageGraph.edges.push({
        source: `token:${row.prov_token}`,
        target: resultNodeId,
        type: 'DERIVED_FROM',
        label: 'probabilistic_derivation'
      });
    }

    // 4. Export
    console.log(`💾 Writing ${lineageGraph.nodes.length} nodes to ${CONFIG.outputFile}...`);
    await fs.writeFile(CONFIG.outputFile, JSON.stringify(lineageGraph, null, 2));
    console.log('✅ Sync complete.');

  } catch (err) {
    console.error('❌ Sync failed:', err.message);
    if (err.message.includes('function provenance() does not exist')) {
        console.error('   Hint: ProvSQL might not be enabled on the table yet.');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
