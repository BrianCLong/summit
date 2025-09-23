import fs from 'node:fs/promises';
import path from 'node:path';

const clientOpsPath = path.resolve('client/artifacts/graphql-ops.json');
const serverSafelistPath = path.resolve('server/src/graphql/safelist.generated.json');

try {
  const [clientRaw, serverRaw] = await Promise.all([
    fs.readFile(clientOpsPath, 'utf8').catch(() => {
      throw new Error(`❌ Client operations file not found: ${clientOpsPath}`);
    }),
    fs.readFile(serverSafelistPath, 'utf8').catch(() => {
      throw new Error(`❌ Server safelist file not found: ${serverSafelistPath}`);
    })
  ]);

  const clientOps = JSON.parse(clientRaw); // { "QueryName": "sha256...", ... } OR array
  const serverList = JSON.parse(serverRaw); // { "sha256...": true } or array of hashes

  const clientHashes = new Set(
    Array.isArray(clientOps) ? clientOps : Object.values(clientOps)
  );
  const serverHashes = new Set(
    Array.isArray(serverList) ? serverList : Object.keys(serverList)
  );

  const missing = [...clientHashes].filter(h => !serverHashes.has(h));
  const extra = [...serverHashes].filter(h => !clientHashes.has(h));

  if (missing.length) {
    console.error('❌ Safelist mismatch — missing hashes on server:');
    missing.forEach(hash => console.error(`  ${hash}`));
    console.error('\nTo fix: Run server safelist update after client codegen');
    process.exit(1);
  }

  if (extra.length > 5) { // Allow some drift for gradual cleanup
    console.warn('⚠️  Many unused hashes on server (consider cleanup):');
    extra.slice(0, 5).forEach(hash => console.warn(`  ${hash}`));
    if (extra.length > 5) console.warn(`  ... and ${extra.length - 5} more`);
  }

  console.log('✅ Safelist verified. All client ops are present on server.');
  console.log(`   Client operations: ${clientHashes.size}`);
  console.log(`   Server whitelist: ${serverHashes.size}`);

} catch (error) {
  console.error('❌ Safelist verification failed:', error.message);
  process.exit(1);
}