import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import chalk from 'chalk';
import { BellingcatImporter, createNormalizedRegistry } from '../../src/toolkit/index.js';

export async function syncToolkit(source: string, outPath: string) {
  if (source.toLowerCase() !== 'bellingcat') {
    throw new Error(`Unsupported toolkit source: ${source}`);
  }

  console.log(chalk.blue(`Syncing toolkit from source: ${source}...`));

  const importer = new BellingcatImporter();
  const rawData = await importer.fetchRawData();
  const tools = importer.parseCSV(rawData);

  console.log(chalk.green(`Successfully parsed ${tools.length} tools.`));

  const registry = createNormalizedRegistry(source, tools);

  // Ensure output directory exists
  mkdirSync(dirname(outPath), { recursive: true });

  writeFileSync(outPath, JSON.stringify(registry, null, 2), 'utf-8');
  console.log(chalk.green(`Successfully wrote deterministic toolkit to: ${outPath}`));
  console.log(chalk.green(`Total tools synced: ${registry.count}`));
}
