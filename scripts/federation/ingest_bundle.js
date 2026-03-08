"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestBundle = ingestBundle;
const fs_1 = require("fs");
const path_1 = require("path");
const crypto_1 = require("crypto");
const validate_federated_bundle_1 = require("./validate_federated_bundle");
const registryPath = (0, path_1.resolve)(__dirname, '../../federation/registry/registry.json');
/**
 * Ingests a federated evidence bundle into the registry.
 * @param bundlePath The path to the bundle to ingest.
 */
async function ingestBundle(bundlePath) {
    // Read the bundle
    const bundle = JSON.parse((0, fs_1.readFileSync)(bundlePath, 'utf-8'));
    // Validate the bundle
    await (0, validate_federated_bundle_1.validateFederatedBundle)(bundle);
    // Calculate the bundle ID
    const bundleHash = (0, crypto_1.createHash)('sha256').update(JSON.stringify(bundle)).digest('hex');
    const bundleId = `${bundle.source_repo.split('/').pop()}-${bundle.tag}-${bundleHash.substring(0, 12)}`;
    // Read the registry
    const registry = JSON.parse((0, fs_1.readFileSync)(registryPath, 'utf-8'));
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
    (0, fs_1.writeFileSync)(registryPath, JSON.stringify(registry, null, 2));
    // Create the ingestion receipt
    const receiptDir = (0, path_1.resolve)(__dirname, `../../artifacts/federation/ingest/${bundleId}`);
    (0, fs_1.mkdirSync)(receiptDir, { recursive: true });
    const receipt = {
        bundle_id: bundleId,
        ingestion_timestamp: new Date().toISOString(),
        status: 'success',
    };
    (0, fs_1.writeFileSync)((0, path_1.resolve)(receiptDir, 'receipt.json'), JSON.stringify(receipt, null, 2));
    const stamp = {
        timestamp: new Date().toISOString(),
    };
    (0, fs_1.writeFileSync)((0, path_1.resolve)(receiptDir, 'stamp.json'), JSON.stringify(stamp, null, 2));
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
        }
        catch (error) {
            console.error(error.message);
            process.exit(1);
        }
    })();
}
