import { Command } from 'commander';
import { fetchMd5List, filterEntriesByDate, GkgFileEntry } from './fetch_raw_index.js';
import { parseGkgV21Stream, mapRowToRecord, GkgV21Record } from './parse_gkg_v21.js';
import { writeEvidence } from '@summit/evidence';
import axios from 'axios';
import AdmZip from 'adm-zip';
import fs from 'fs-extra';
import path from 'path';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';

const program = new Command();

program
  .name('gdelt-gkg-connector')
  .description('GDELT GKG 2.1 Connector')
  .requiredOption('-d, --date <date>', 'Date in YYYYMMDD or YYYYMMDDHHMMSS format')
  .option('-o, --output <dir>', 'Output directory', 'artifacts/evidence')
  .option('--limit <number>', 'Limit number of records to process')
  .action(async (options) => {
    try {
      await run(options);
    } catch (error) {
      console.error('Execution failed:', error);
      process.exit(1);
    }
  });

async function run(options: any) {
  const dateStr = options.date;
  const outputDir = options.output;
  const limit = options.limit ? parseInt(options.limit) : undefined;

  console.log(`Starting GDELT GKG connector for date: ${dateStr}`);

  // 1. Fetch Index
  const entries = await fetchMd5List();
  const matched = filterEntriesByDate(entries, dateStr);

  if (matched.length === 0) {
    console.error(`No files found for date ${dateStr}`);
    process.exit(1);
  }

  console.log(`Found ${matched.length} files matching ${dateStr}`);

  const aggregatedMetrics = {
    totalRecords: 0,
    filesProcessed: 0,
    recordsPerTheme: {} as Record<string, number>,
  };

  // Deterministic runId based on batch date
  const runId = `gdelt-gkg-${dateStr}`;

  // EVID::gdelt_gkg::<yyyymmdd>::<batch_ts>::<artifact>::v1
  // If dateStr is full timestamp, use it. If not, use first matched file's timestamp?
  // Let's assume dateStr passed is the batch timestamp if it's 14 chars.
  // If dateStr is 8 chars (day), then runId covers the day.
  // We'll use dateStr as the batch_ts component.
  // Extract YYYYMMDD from dateStr
  const yyyymmdd = dateStr.substring(0, 8);
  const evidenceId = `EVID::gdelt_gkg::${yyyymmdd}::${dateStr}::report::v1`;

  for (const entry of matched) {
    console.log(`Processing ${entry.filename}...`);

    let buffer: Buffer;

    if (entry.url.startsWith('file://')) {
        const filePath = fileURLToPath(entry.url);
        buffer = await fs.readFile(filePath);
    } else {
        // Download
        const response = await axios.get(entry.url, { responseType: 'arraybuffer' });
        buffer = Buffer.from(response.data);
    }

    // Verify MD5
    const md5sum = createHash('md5').update(buffer).digest('hex');
    if (md5sum !== entry.md5) {
      console.warn(`MD5 mismatch for ${entry.filename}. Expected ${entry.md5}, got ${md5sum}`);
      throw new Error(`MD5 mismatch for ${entry.filename}`);
    }

    // Unzip
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    const csvEntry = zipEntries.find(e => e.entryName.endsWith('.csv'));

    if (!csvEntry) {
      console.warn(`No CSV found in ${entry.filename}`);
      continue;
    }

    const csvContent = csvEntry.getData().toString('utf8');

    // Parse
    const stream = Readable.from([csvContent]);
    const parser = parseGkgV21Stream(stream);

    let recordCount = 0;
    for await (const row of parser) {
      const record = mapRowToRecord(row as string[]);
      recordCount++;
      aggregatedMetrics.totalRecords++;

      // Basic metrics (Top 100 themes?)
      if (record.Themes) {
        const themes = record.Themes.split(';');
        for (const theme of themes) {
          if (!theme) continue;
           aggregatedMetrics.recordsPerTheme[theme] = (aggregatedMetrics.recordsPerTheme[theme] || 0) + 1;
        }
      }

      if (limit && recordCount >= limit) break;
    }

    aggregatedMetrics.filesProcessed++;
    if (limit && aggregatedMetrics.totalRecords >= limit) break;
  }

  // Filter top themes
  const topThemes = Object.entries(aggregatedMetrics.recordsPerTheme)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 50)
    .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});

  aggregatedMetrics.recordsPerTheme = topThemes;

  // Write Evidence
  const report = {
    evidence_id: evidenceId,
    packName: 'connectors/gdelt-gkg',
    runId: runId,
    metrics: aggregatedMetrics,
    parameters: {
      date: dateStr,
      files: matched.map(e => e.filename)
    }
  };

  const evidencePath = await writeEvidence(report, outputDir);
  console.log(`Evidence written to ${evidencePath}`);
}

program.parse();
