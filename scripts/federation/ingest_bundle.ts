import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { createHash } from 'crypto';
import { validateFederatedBundle } from './validate_federated_bundle';

const registryPath = resolve(__dirname, '../../federation/registry/registry.json');

/**
 * Ingests a federated evidence bundle into the registry.
 * @param bundlePath The path to the bundle to ingest.
 */
export async function ingestBundle(bundlePath: string): Promise<void> {
  // Read the bundle
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf-8'));

  // Validate the bundle
  await validateFederatedBundle(bundle);

  // Calculate the bundle ID
  const bundleHash = createHash('sha256').update(JSON.stringify(bundle)).digest('hex');
  const bundleId = `${bundle.source_repo.split('/').pop()}-${bundle.tag}-${bundleHash.substring(0, 12)}`;

  // Read the registry
  const registry = JSON.parse(readFileSync(registryPath, 'utf-8'));

  // Add the new bundle to the registry
  registry.push({
    id: bundleId,
    source_repo: bundle.source_repo,
    source_sha: bundle.source_sha,
    tag: bundle.tag,
    build_timestamp: bundle.build_timestamp,
    ingested_at: new Date().toISOString(),
    bundle_path: bundlePath,
  });

  // Write the updated registry
  writeFileSync(registryPath, JSON.stringify(registry, null, 2));

  // Create the ingestion receipt
  const receiptDir = resolve(__dirname, `../../artifacts/federation/ingest/${bundleId}`);
  mkdirSync(receiptDir, { recursive: true });

  const receipt = {
    bundle_id: bundleId,
    ingestion_timestamp: new Date().toISOString(),
    status: 'success',
  };
  writeFileSync(resolve(receiptDir, 'receipt.json'), JSON.stringify(receipt, null, 2));

  const stamp = {
    timestamp: new Date().toISOString(),
  };
  writeFileSync(resolve(receiptDir, 'stamp.json'), JSON.stringify(stamp, null, 2));
}

// Example usage:
if (require.main === module) {
  (async () => {
    try {
      const bundlePath = process.argv[2];
      if (!bundlePath) {
        console.error('Usage: ts-node ingest_bundle.ts <path-to-bundle.json>');
        process.exit(1);
      }
      await ingestBundle(bundlePath);
      console.log('Bundle ingested successfully.');
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  })();
}
