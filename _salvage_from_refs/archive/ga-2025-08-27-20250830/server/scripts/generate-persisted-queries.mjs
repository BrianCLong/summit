import PersistedQueriesPlugin from '../src/graphql/plugins/persistedQueries.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const plugin = new PersistedQueriesPlugin({
    enabled: false,
    allowNonPersisted: true,
    generateOnBuild: true,
    queriesFilePath: path.join(process.cwd(), 'persisted-queries.json'),
  });
  // Generate the initial set (includes provenance + export)
  await plugin.generateInitialQueries();
  // Optionally merge from extra file if provided
  const extraPath = path.join(process.cwd(), 'persisted-extra.json');
  try {
    const extra = JSON.parse(await (await import('fs/promises')).readFile(extraPath, 'utf8'));
    for (const [hash, data] of Object.entries(extra)) {
      plugin.persistedQueries.set(hash, data);
    }
    await plugin.savePersistedQueries();
    console.log('Merged extra persisted queries');
  } catch {}
  console.log('Persisted queries generated.');
}

main().catch((e) => { console.error(e); process.exit(1); });
