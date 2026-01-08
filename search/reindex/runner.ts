import { Client } from "typesense";
import fs from "fs";
import path from "path";

const typesense = new Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || "localhost",
      port: parseInt(process.env.TYPESENSE_PORT || "8108"),
      protocol: process.env.TYPESENSE_PROTOCOL || "http",
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY || "xyz",
  connectionTimeoutSeconds: 10,
  numRetries: 3,
});

async function runReindex(collectionType: string, newVersion: number) {
  const currentAlias = `${collectionType}@current`;
  const newCollectionName = `${collectionType}@v${newVersion}`;

  console.log(`[Reindex] Starting ${collectionType} -> ${newCollectionName}`);

  try {
    const schemaPath = path.resolve(__dirname, `../schemas/${collectionType}@v${newVersion}.json`);

    if (!fs.existsSync(schemaPath)) {
      console.error(`Schema not found at ${schemaPath}`);
      process.exit(1);
    }

    console.log(`Loading schema from ${schemaPath}`);
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    schema.name = newCollectionName;

    try {
      await typesense.collections(newCollectionName).retrieve();
      console.log(`Collection ${newCollectionName} exists. Deleting...`);
      await typesense.collections(newCollectionName).delete();
    } catch (e: any) {
      if (e.httpStatus !== 404) console.warn("Check collection warning:", e.message);
    }

    console.log(`Creating collection ${newCollectionName}...`);
    await typesense.collections().create(schema);

    // TRIGGER BACKFILL
    console.log("Triggering backfill...");
    // In a real system, invoke the backfill job via API or queue
    // e.g. await axios.post('http://search-indexer/backfill', { collection: newCollectionName });

    console.log("Waiting for data ingestion (simulation)...");

    // Wait loop for demonstration of safety check
    let attempts = 0;
    let newCount = 0;

    while (attempts < 5) {
      const stats = await typesense.collections(newCollectionName).retrieve();
      newCount = stats.num_documents;
      if (newCount > 0) break;
      await new Promise((r) => setTimeout(r, 1000));
      attempts++;
    }

    // PARITY CHECK
    console.log("Running parity checks...");
    let currentCount = 0;
    try {
      const stats = await typesense.collections(currentAlias).retrieve();
      currentCount = stats.num_documents;
    } catch (e) {
      console.log("Current alias not found (first run).");
    }

    const newStats = await typesense.collections(newCollectionName).retrieve();
    newCount = newStats.num_documents;

    console.log(`Counts: Current=${currentCount}, New=${newCount}`);

    // CRITICAL SAFETY CHECK
    if (newCount === 0 && currentCount > 0) {
      throw new Error(
        `ABORTING: New collection ${newCollectionName} is empty, but current has ${currentCount} docs.`
      );
    }

    if (currentCount > 0) {
      const diff = Math.abs(currentCount - newCount);
      const pct = diff / currentCount;
      if (pct > 0.05) {
        // 5% tolerance
        console.warn(
          `WARNING: Doc count mismatch > 5% (${(pct * 100).toFixed(2)}%). Verification needed.`
        );
      }
    }

    // ALIAS SWAP
    console.log(`Swapping alias ${currentAlias} to point to ${newCollectionName}`);
    await typesense.aliases().upsert(currentAlias, { collection_name: newCollectionName });

    console.log("SUCCESS: Reindex complete.");
  } catch (err) {
    console.error("Reindex FAILED:", err);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
if (args.length >= 2) {
  const type = args[0];
  const version = parseInt(args[1].replace("v", ""));
  runReindex(type, version);
} else {
  console.log("Usage: ts-node runner.ts <type> <version>");
}
