
import assert from 'node:assert';
import { isDemoEnabled } from '../../server/src/demo/gate.ts';
import { demoGate } from '../../server/src/demo/middleware.ts';

// MOCK: pino and logger to avoid package resolution issues in this isolated script
// We inject a mock logger into the global scope or similar if possible,
// but since we are importing source files that import 'logger', we might hit issues if we can't resolve 'pino'.
//
// However, since we are using 'tsx', we can try to rely on the fact that `pino` IS in the server's node_modules.
// The previous error `Cannot find package 'pino'` suggests `tsx` isn't looking in `server/node_modules`.
//
// Workaround: We will mock the logger module using a simple replacement if we were using Jest.
// With `tsx`, we are running the actual code.
// Let's try to fix the resolution by running `tsx` from the `server` directory so it finds `node_modules`.

console.log('🧪 Starting Demo Mode verification...\n');

// --- Helper Types ---
type MockRequest = {
  path: string;
  ip: string;
};

type MockResponse = {
  statusCode?: number;
  body?: any;
  status: (code: number) => MockResponse;
  json: (body: any) => MockResponse;
};

// --- Tests ---

async function testGateLogic() {
  console.log('Test 1: isDemoEnabled logic');
  const originalEnv = process.env.DEMO_MODE;

  try {
    process.env.DEMO_MODE = 'true';
    assert.strictEqual(isDemoEnabled(), true, 'Should be true when DEMO_MODE=true');

    process.env.DEMO_MODE = 'false';
    assert.strictEqual(isDemoEnabled(), false, 'Should be false when DEMO_MODE=false');

    process.env.DEMO_MODE = 'enabled';
    assert.strictEqual(isDemoEnabled(), false, 'Should be false when DEMO_MODE=enabled');

    process.env.DEMO_MODE = '1';
    assert.strictEqual(isDemoEnabled(), false, 'Should be false when DEMO_MODE=1');

    delete process.env.DEMO_MODE;
    assert.strictEqual(isDemoEnabled(), false, 'Should be false when DEMO_MODE is missing');

    console.log('✅ Gate logic passed');
  } finally {
    process.env.DEMO_MODE = originalEnv;
  }
}

async function testMiddlewareDisabled() {
  console.log('\nTest 2: Middleware (Disabled)');
  const originalEnv = process.env.DEMO_MODE;

  try {
    // Ensure disabled
    process.env.DEMO_MODE = 'false';

    let nextCalled = false;
    const next = () => { nextCalled = true; };

    const req = { path: '/api/demo/reset', ip: '127.0.0.1' } as any;

    const res: MockResponse = {
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; }
    };

    demoGate(req, res as any, next);

    assert.strictEqual(nextCalled, false, 'next() should NOT be called when disabled');
    assert.strictEqual(res.statusCode, 404, 'Should return 404 Not Found');
    assert.deepStrictEqual(res.body, { error: 'Not Found' }, 'Should return error JSON');

    console.log('✅ Middleware (Disabled) passed');
  } finally {
    process.env.DEMO_MODE = originalEnv;
  }
}

async function testMiddlewareEnabled() {
  console.log('\nTest 3: Middleware (Enabled)');
  const originalEnv = process.env.DEMO_MODE;

  try {
    // Ensure enabled
    process.env.DEMO_MODE = 'true';

    let nextCalled = false;
    const next = () => { nextCalled = true; };

    const req = { path: '/api/demo/reset', ip: '127.0.0.1' } as any;

    const res: MockResponse = {
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; }
    };

    demoGate(req, res as any, next);

    assert.strictEqual(nextCalled, true, 'next() SHOULD be called when enabled');
    assert.strictEqual(res.statusCode, undefined, 'Response should not be modified');

    console.log('✅ Middleware (Enabled) passed');
  } finally {
    process.env.DEMO_MODE = originalEnv;
  }
}

// --- Runner ---

(async () => {
  try {
    await testGateLogic();
    await testMiddlewareDisabled();
    await testMiddlewareEnabled();
    console.log('\n✨ All verification tests passed!');
  } catch (err) {
    console.error('\n❌ Verification failed:', err);
    process.exit(1);
  }
})();
