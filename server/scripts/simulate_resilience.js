"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const process_1 = __importDefault(require("process"));
// Mock environment variables for testing
process_1.default.env.PG_WRITE_POOL_SIZE = '1';
process_1.default.env.PG_READ_POOL_SIZE = '1';
process_1.default.env.PG_CONNECT_TIMEOUT_MS = '100';
process_1.default.env.PG_RETRY_BASE_DELAY_MS = '50'; // Fast retries for simulation
process_1.default.env.PG_RETRY_MAX_DELAY_MS = '200';
process_1.default.env.PG_CIRCUIT_BREAKER_FAILURE_THRESHOLD = '3'; // Trip fast
process_1.default.env.PG_CIRCUIT_BREAKER_COOLDOWN_MS = '1000';
process_1.default.env.POSTGRES_HOST = 'non-existent-host-for-testing'; // Force failure
process_1.default.env.LLM_PROVIDER = 'openai';
process_1.default.env.LLM_API_KEY = 'test-key';
process_1.default.env.LLM_MAX_RETRIES = '3';
// Mock logger to avoid noise but capture relevant info
const logs = [];
const mockLogger = {
    info: (msg, meta) => logs.push({ level: 'INFO', msg, meta }),
    warn: (msg, meta) => logs.push({ level: 'WARN', msg, meta }),
    error: (msg, meta) => logs.push({ level: 'ERROR', msg, meta }),
    debug: (msg, meta) => { }, // ignore debug
    child: () => mockLogger
};
// Since we can't easily mock imports in ESM without a loader, we will rely on
// the actual logger but filter output, OR just observe the real logs.
// For this script, we'll let the real logger run but maybe pipe stdout.
// Actually, let's just use the real classes and mock global.fetch.
const postgres_js_1 = require("../src/db/postgres.js");
const LLMService_js_1 = __importDefault(require("../src/services/LLMService.js"));
async function runSimulation() {
    console.log('=== STARTING RESILIENCE SIMULATION ===\n');
    // --- SCENARIO 1: PostgreSQL Outage ---
    console.log('--- SCENARIO 1: PostgreSQL Outage at Startup ---');
    try {
        const pool = (0, postgres_js_1.getPostgresPool)();
        console.log('Pool initialized. Attempting connection (expecting failure)...');
        // We expect this to retry and then fail
        const start = Date.now();
        try {
            await pool.query('SELECT 1');
        }
        catch (e) {
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
        }
        else {
            console.log('❌ FAIL: PostgreSQL Circuit Breaker did NOT trip');
        }
    }
    catch (error) {
        console.error('Unexpected error in DB simulation:', error);
    }
    finally {
        await (0, postgres_js_1.closePostgresPool)();
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
        };
    };
    const llmService = new LLMService_js_1.default({
        maxRetries: 3,
        timeout: 1000
    });
    try {
        console.log('Attempting LLM completion (expecting retries then failure)...');
        await llmService.complete({ prompt: 'test' });
    }
    catch (e) {
        console.log(`LLM call failed as expected: ${e.message}`);
    }
    // Check circuit state
    // We need to access the shared map we created
    const breaker = LLMService_js_1.default.circuitBreakers?.get('llm-openai');
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
            }
            catch (e) { }
            console.log(`New State: ${breaker.getState()}`);
        }
        if (breaker.getState() === 'open') {
            console.log('✅ PASS: LLM Circuit Breaker tripped to OPEN');
        }
        else {
            console.log(`❌ FAIL: LLM Circuit Breaker did NOT trip. Count: ${breaker.getFailureCount()}`);
        }
        // Verify short circuit
        console.log('Testing Short Circuit (should not call fetch)...');
        const preCallCount = fetchCallCount;
        try {
            await llmService.complete({ prompt: 'test 3' });
        }
        catch (e) {
            console.log(`Immediate failure: ${e.message}`);
        }
        if (fetchCallCount === preCallCount) {
            console.log('✅ PASS: LLM Short Circuit active (no new fetch calls)');
        }
        else {
            console.log('❌ FAIL: LLM Short Circuit inactive (fetch was called)');
        }
    }
    else {
        console.log('❌ FAIL: Could not find LLM circuit breaker');
    }
    console.log('\n=== SIMULATION COMPLETE ===');
}
runSimulation();
