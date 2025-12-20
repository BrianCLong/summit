
import process from 'process';

// Mock environment variables for testing
process.env.PG_WRITE_POOL_SIZE = '1';
process.env.PG_READ_POOL_SIZE = '1';
process.env.PG_CONNECT_TIMEOUT_MS = '100';
process.env.PG_RETRY_BASE_DELAY_MS = '50'; // Fast retries for simulation
process.env.PG_RETRY_MAX_DELAY_MS = '200';
process.env.PG_CIRCUIT_BREAKER_FAILURE_THRESHOLD = '3'; // Trip fast
process.env.PG_CIRCUIT_BREAKER_COOLDOWN_MS = '1000';
process.env.POSTGRES_HOST = 'non-existent-host-for-testing'; // Force failure
process.env.LLM_PROVIDER = 'openai';
process.env.LLM_API_KEY = 'test-key';
process.env.LLM_MAX_RETRIES = '3';

// Mock logger to avoid noise but capture relevant info
const logs: any[] = [];
const mockLogger = {
  info: (msg: string, meta: any) => logs.push({ level: 'INFO', msg, meta }),
  warn: (msg: string, meta: any) => logs.push({ level: 'WARN', msg, meta }),
  error: (msg: string, meta: any) => logs.push({ level: 'ERROR', msg, meta }),
  debug: (msg: string, meta: any) => {}, // ignore debug
  child: () => mockLogger
};

// Mock the logger module
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Since we can't easily mock imports in ESM without a loader, we will rely on
// the actual logger but filter output, OR just observe the real logs.
// For this script, we'll let the real logger run but maybe pipe stdout.
// Actually, let's just use the real classes and mock global.fetch.

import { getPostgresPool, closePostgresPool } from '../src/db/postgres.js';
import LLMService from '../src/services/LLMService.js';
import { CircuitBreaker } from '../src/utils/CircuitBreaker.js';

async function runSimulation() {
  console.log('=== STARTING RESILIENCE SIMULATION ===\n');

  // --- SCENARIO 1: PostgreSQL Outage ---
  console.log('--- SCENARIO 1: PostgreSQL Outage at Startup ---');
  try {
    const pool = getPostgresPool();
    console.log('Pool initialized. Attempting connection (expecting failure)...');

    // We expect this to retry and then fail
    const start = Date.now();
    try {
        await pool.query('SELECT 1');
    } catch (e: any) {
        console.log(`Query failed as expected: ${e.message}`);
    }
    const duration = Date.now() - start;
    console.log(`Total duration: ${duration}ms`);

    // Check health/circuit state
    const health = await pool.healthCheck();
    console.log('Pool Health Snapshot:', JSON.stringify(health, null, 2));

    const openCircuit = health.find(h => h.circuitState === 'open');
    if (openCircuit) {
        console.log('✅ PASS: PostgreSQL Circuit Breaker tripped to OPEN');
    } else {
        console.log('❌ FAIL: PostgreSQL Circuit Breaker did NOT trip');
    }

  } catch (error) {
    console.error('Unexpected error in DB simulation:', error);
  } finally {
      await closePostgresPool();
  }

  // --- SCENARIO 2: LLM Service 5xx Storm ---
  console.log('\n--- SCENARIO 2: LLM Service 5xx Storm ---');

  // Mock global fetch
  let fetchCallCount = 0;
  global.fetch = async () => {
      fetchCallCount++;
      console.log(`[MockFetch] Call #${fetchCallCount} - Returning 503`);
      return {
          ok: false,
          status: 503,
          text: async () => 'Service Unavailable',
          json: async () => ({ error: 'Service Unavailable' })
      } as any;
  };

  const llmService = new LLMService({
      maxRetries: 3,
      timeout: 1000
  });

  try {
      console.log('Attempting LLM completion (expecting retries then failure)...');
      await llmService.complete({ prompt: 'test' });
  } catch (e: any) {
      console.log(`LLM call failed as expected: ${e.message}`);
  }

  // Check circuit state
  // We need to access the shared map we created
  const breaker = (LLMService as any).circuitBreakers?.get('llm-openai');
  if (breaker) {
      const state = breaker.getState();
      const failures = breaker.getFailureCount();
      console.log(`LLM Circuit State: ${state}, Failures: ${failures}`);

      // We triggered 1 call with 3 retries = 4 failures?
      // Logic in LLMService: attempt 0..maxRetries.
      // attempt 0 -> fail -> breaker record fail (1)
      // attempt 1 -> fail -> breaker record fail (2)
      // attempt 2 -> fail -> breaker record fail (3)
      // attempt 3 -> fail -> breaker record fail (4)
      // Throw.
      // Threshold is 5. We might need one more call to trip it fully.

      if (state !== 'open') {
          console.log('Circuit not open yet (count < threshold). Triggering one more failure...');
          try {
             await llmService.complete({ prompt: 'test 2' });
          } catch (e) {}
          console.log(`New State: ${breaker.getState()}`);
      }

      if (breaker.getState() === 'open') {
          console.log('✅ PASS: LLM Circuit Breaker tripped to OPEN');
      } else {
          console.log(`❌ FAIL: LLM Circuit Breaker did NOT trip. Count: ${breaker.getFailureCount()}`);
      }

      // Verify short circuit
      console.log('Testing Short Circuit (should not call fetch)...');
      const preCallCount = fetchCallCount;
      try {
          await llmService.complete({ prompt: 'test 3' });
      } catch (e: any) {
          console.log(`Immediate failure: ${e.message}`);
      }
      if (fetchCallCount === preCallCount) {
           console.log('✅ PASS: LLM Short Circuit active (no new fetch calls)');
      } else {
           console.log('❌ FAIL: LLM Short Circuit inactive (fetch was called)');
      }

  } else {
      console.log('❌ FAIL: Could not find LLM circuit breaker');
  }

  console.log('\n=== SIMULATION COMPLETE ===');
}

runSimulation();
