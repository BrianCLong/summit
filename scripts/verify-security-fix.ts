
// scripts/verify-security-fix.ts
process.env.NODE_ENV = 'production';

// Set required production vars to satisfying values to isolate EXPORT_SIGNING_SECRET
process.env.PORT = '4000';
process.env.DATABASE_URL = 'postgresql://user:pass@production-db:5432/dbname';
process.env.NEO4J_URI = 'bolt://production-neo4j:7687';
process.env.NEO4J_USER = 'neo4j';
process.env.NEO4J_PASSWORD = 'super-secure-production-password-neo4j';
process.env.REDIS_HOST = 'production-redis';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = 'super-secure-production-password-redis';
// Avoid words 'secret', 'devpassword', 'changeme', 'localhost'
process.env.JWT_SECRET = 'super-secure-production-jwt-token-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'super-secure-production-jwt-refresh-token-32-chars-long';
process.env.CORS_ORIGIN = 'https://app.intelgraph.com';

// Delete the target secret
delete process.env.EXPORT_SIGNING_SECRET;

// Mock console.error back to silence
const originalError = console.error;
console.error = () => {};

// Mock process.exit
let exitCode: number | undefined;
const originalExit = process.exit;
process.exit = ((code?: number) => {
  exitCode = code;
  // Throw error to stop execution, effectively simulating exit
  throw new Error('PROCESS_EXIT');
}) as any;

async function run() {
  try {
    // Dynamic import to trigger the config logic
    await import('../server/src/config.ts');
  } catch (e: any) {
    if (e.message !== 'PROCESS_EXIT') {
      console.log('Unexpected error:', e);
    }
  }

  // Restore console.error
  console.error = originalError;

  if (exitCode === 1) {
    console.log('✅ Verification Passed: Config check failed as expected in production without secret.');
    originalExit(0);
  } else {
    console.log('❌ Verification Failed: Config check did NOT fail in production without secret.');
    originalExit(1);
  }
}

run();
