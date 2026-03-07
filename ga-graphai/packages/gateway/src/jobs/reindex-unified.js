#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildSearchService } from "../search/unified.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataset =
  process.argv[2] ?? path.resolve(__dirname, "../../../../test-data/search-index-sample.json");

async function main() {
  const service = buildSearchService();
  service.reindexFromFile(dataset);
  console.log(JSON.stringify({ indexed: service.index.documents.length, dataset }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
