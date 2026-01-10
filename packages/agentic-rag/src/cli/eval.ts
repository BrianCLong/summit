#!/usr/bin/env ts-node
import fs from 'fs';
import readline from 'readline';
import { Pool } from 'pg';
import { RAGOrchestrator } from '../core/orchestrator.js';
import { PgVectorStore } from '../core/vectorStore.js';

interface EvalCase {
  query: string;
  expectedSources: string[];
}

async function loadDataset(path: string): Promise<EvalCase[]> {
  const file = readline.createInterface({ input: fs.createReadStream(path) });
  const records: EvalCase[] = [];
  for await (const line of file) {
    if (!line.trim()) continue;
    records.push(JSON.parse(line));
  }
  return records;
}

async function main() {
  const datasetPath = process.argv[2] || './eval/agentic-rag/golden.jsonl';
  const dataset = await loadDataset(datasetPath);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const orchestrator = new RAGOrchestrator({
    vectorStore: new PgVectorStore({ pool }),
  });

  const results = [] as any[];
  for (const test of dataset) {
    const start = performance.now();
    const response = await orchestrator.answer({ query: test.query, topK: 5, useHyde: false, useTools: true });
    const latency = performance.now() - start;
    const hitRate = response.citations.filter((c) => test.expectedSources.includes(c.sourceId)).length / Math.max(1, test.expectedSources.length);
    results.push({ query: test.query, latencyMs: latency, hitRate, citations: response.citations.length });
  }

  console.log(JSON.stringify({ results }, null, 2));
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

