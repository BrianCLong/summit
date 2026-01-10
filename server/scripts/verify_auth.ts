// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import assert from 'node:assert';
import crypto from 'crypto';

// Mock Logger
const mockLogger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.log
};

// Mock Auth Service & DB
const mockAuthService = {
  verifyToken: async () => null
};

const mockPool = {
  connect: async () => ({
    query: async () => ({ rows: [] }),
    release: () => {}
  }),
  query: async () => ({ rows: [] })
};

// Header keys
const HEADER_TENANT_ID = 'x-tenant-id';
const HEADER_API_KEY = 'x-api-key';

// Logic copied from middleware for verification
async function unifiedAuthMiddleware(req, res, next) {
    let principal = null;
    const requestedTenantId = req.headers[HEADER_TENANT_ID];

    // 2. Try API Key (Machine)
    if (!principal) {
      const apiKey = req.headers[HEADER_API_KEY];
      if (apiKey) {

        // --- NEW LOGIC START ---
        const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

        // Checking DB mock
        const dbResult = await mockPool.query(
            'SELECT * FROM api_keys WHERE key_hash = $1 AND is_active = true',
            [hashedKey]
        );

        if (dbResult.rows.length > 0) {
             const keyRecord = dbResult.rows[0];
             principal = {
               id: keyRecord.service_name || 'system',
               tenantId: requestedTenantId || 'global',
               roles: keyRecord.roles || ['system.internal'],
               scopes: keyRecord.scopes || ['*'],
               authMethod: 'apiKey',
               isSystem: true
             };
        }
        // --- NEW LOGIC END ---

        // Fallback for transition
        if (!principal && process.env.SYSTEM_API_KEY && apiKey === process.env.SYSTEM_API_KEY) {
             principal = {
               id: 'system',
               tenantId: requestedTenantId || 'global',
               roles: ['system.internal', 'tenant.admin'],
               scopes: ['*'],
               authMethod: 'apiKey',
               isSystem: true
             };
        }
      }
    }

    if (principal) {
      req.principal = principal;
    }

    next();
}

// TEST HARNESS
async function run() {
  console.log('--- TEST: API Key Verification Logic ---');

  // Scenario 1: DB Key (Mocked)
  const realKey = 'db-key-123';
  const hashed = crypto.createHash('sha256').update(realKey).digest('hex');

  mockPool.query = async (text, params) => {
    if (params[0] === hashed) {
        return { rows: [{ service_name: 'db-service', roles: ['admin'] }] };
    }
    return { rows: [] };
  };

  const req1 = { headers: { 'x-api-key': realKey }, principal: undefined };
  const res1 = {};
  await unifiedAuthMiddleware(req1, res1, () => {});

  if (req1.principal?.id === 'db-service') {
      console.log('SUCCESS: DB Key verified (with hash)');
  } else {
      console.error('FAILURE: DB Key not verified');
      process.exit(1);
  }

  // Scenario 2: Env Var Key (Fallback)
  process.env.SYSTEM_API_KEY = 'env-key-999';
  const req2 = { headers: { 'x-api-key': 'env-key-999' }, principal: undefined };
  await unifiedAuthMiddleware(req2, res1, () => {});

  if (req2.principal?.id === 'system') {
      console.log('SUCCESS: Env Key verified');
  } else {
      console.error('FAILURE: Env Key not verified');
      process.exit(1);
  }
}

run();
