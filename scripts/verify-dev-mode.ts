
// scripts/verify-dev-mode.ts
process.env.NODE_ENV = 'development';

// Set required vars for validation to pass
process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
process.env.NEO4J_URI = 'bolt://localhost:7687';
process.env.NEO4J_USER = 'neo4j';
process.env.NEO4J_PASSWORD = 'password';
process.env.JWT_SECRET = 'a-secret-that-is-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'another-secret-that-is-at-least-32-characters-long';

// delete process.env.EXPORT_SIGNING_SECRET; // Let it be undefined

// Mock console.error
const originalError = console.error;
// console.error = () => {};

// Mock process.exit
const originalExit = process.exit;
process.exit = ((code?: number) => {
  console.log(`Process exited with code ${code}`);
  throw new Error('PROCESS_EXIT');
}) as any;

async function run() {
  try {
    const { cfg } = await import('../server/src/config.ts');

    if (cfg.EXPORT_SIGNING_SECRET === undefined) {
      console.log('✅ cfg.EXPORT_SIGNING_SECRET is undefined in dev (correct).');
    } else {
      console.log('❌ cfg.EXPORT_SIGNING_SECRET is defined but should be undefined:', cfg.EXPORT_SIGNING_SECRET);
      originalExit(1);
    }

    // Attempt to import the routes to ensure they resolve imports correctly
    console.log('Importing routes...');
    await import('../server/src/routes/export.ts');
    await import('../server/src/routes/exports.ts');
    console.log('✅ Routes imported successfully.');

    console.log('✅ Dev mode verification passed.');
    originalExit(0);
  } catch (e: any) {
    if (e.message !== 'PROCESS_EXIT') {
      console.log('❌ Dev mode verification failed (crashed):', e);
    }
    originalExit(1);
  }
}

run();
