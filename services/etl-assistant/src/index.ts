import { Worker } from 'bullmq';
import { getRedisClient } from '@intelgraph/redis';
import fs from 'fs';
import csv from 'csv-parser';
import { Enricher } from './enrichers/enricher';
import { GeoIPEnricher } from './enrichers/geoip';
import { OCREnricher } from './enrichers/ocr';
import { PolicyEngine } from './policy';
import { ProvenanceStore } from './provenance';

const redisClient = getRedisClient();

const enrichers: Enricher[] = [
  new GeoIPEnricher(),
  new OCREnricher(),
];

const policyEngine = new PolicyEngine();
const provenanceStore = new ProvenanceStore();

const worker = new Worker('ingestion-queue', async job => {
  console.log(`Processing job ${job.id}`);
  const { filePath } = job.data;

  const stream = fs.createReadStream(filePath).pipe(csv());

  for await (const row of stream) {
    let enrichedData = { ...row };
    const appliedEnrichers: string[] = [];

    for (const enricher of enrichers) {
      const originalData = { ...enrichedData };
      enrichedData = await enricher.enrich(enrichedData);
      if (JSON.stringify(originalData) !== JSON.stringify(enrichedData)) {
        appliedEnrichers.push(enricher.name);
      }
    }

    const dataAfterPolicies = await policyEngine.applyPolicies(enrichedData);

    await provenanceStore.recordLineage(row, dataAfterPolicies, appliedEnrichers);

    // In a real implementation, we would now load the data into the primary stores.
    console.log('Final Data:', dataAfterPolicies);
  }

  console.log(`Completed job ${job.id}`);
}, { connection: redisClient });

console.log('ETL Assistant worker started.');
