import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { newDb } from 'pg-mem';
import { randomUUID } from 'node:crypto';

// Create pg-mem instance
const db = newDb();

// Register gen_random_uuid extension
db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: db.public.getType('uuid'),
    implementation: () => randomUUID()
});

// Create a pool from pg-mem
const { Pool } = db.adapters.createPg();
const pool = new Pool();

// Mock getPostgresPool
jest.unstable_mockModule('../../db/postgres.js', () => ({
  getPostgresPool: () => pool,
  closePostgresPool: async () => {},
}));

// Mock logger to avoid noise
jest.unstable_mockModule('../../config/logger.js', () => ({
  default: {
    child: () => ({
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {},
    }),
  },
  logger: {
    child: () => ({
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {},
    }),
  },
  correlationStorage: {
    getStore: () => new Map(),
    run: (store: any, callback: any) => callback(),
  }
}));

const TENANT_ID = 'tenant-audit-flow';
const USER_ID = 'audit-flow-user';

describe('Audit Flow Integration', () => {
  let app: express.Express;
  let pg: any;
  let caseId: string;
  let caseRouter: any;
  let auditAccessRouter: any;

  beforeAll(async () => {
    // Dynamic imports after mocking
    const { getPostgresPool } = await import('../../db/postgres.js');
    pg = getPostgresPool();

    // Create Schema
    await pg.query(`CREATE SCHEMA IF NOT EXISTS maestro`);

    // Create tables required by CaseService/Repo
    await pg.query(`
        CREATE TABLE maestro.cases (
            id UUID PRIMARY KEY,
            tenant_id TEXT,
            title TEXT,
            description TEXT,
            status TEXT,
            compartment TEXT,
            policy_labels TEXT[],
            metadata JSONB,
            created_by TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        )
    `);

    // Create audit access logs table
    await pg.query(`
        CREATE TABLE maestro.audit_access_logs (
          id UUID PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          case_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          action TEXT NOT NULL,
          resource_type TEXT,
          resource_id TEXT,
          reason TEXT NOT NULL,
          legal_basis TEXT NOT NULL,
          warrant_id TEXT,
          authority_reference TEXT,
          approval_chain JSONB DEFAULT '[]',
          ip_address TEXT,
          user_agent TEXT,
          session_id TEXT,
          request_id TEXT,
          correlation_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          hash TEXT,
          previous_hash TEXT,
          metadata JSONB DEFAULT '{}'
        )
    `);

    // Create provenance ledger table
    await pg.query(`
        CREATE TABLE provenance_ledger_v2 (
          id TEXT PRIMARY KEY,
          tenant_id TEXT,
          sequence_number BIGINT,
          previous_hash TEXT,
          current_hash TEXT,
          timestamp TIMESTAMPTZ,
          action_type TEXT,
          resource_type TEXT,
          resource_id TEXT,
          actor_id TEXT,
          actor_type TEXT,
          payload JSONB,
          metadata JSONB,
          signature TEXT,
          attestation JSONB
        )
    `);

    // Seed Data
    const { rows } = await pg.query(
      `INSERT INTO maestro.cases (id, tenant_id, title, status, created_by)
       VALUES (gen_random_uuid(), $1, 'Audit Flow Case', 'open', $2)
       RETURNING id`,
      [TENANT_ID, USER_ID]
    );
    caseId = rows[0].id;

    // Import routers
    const caseRouterModule = await import('../cases.js');
    const auditRouterModule = await import('../audit-access.js');

    caseRouter = caseRouterModule.default ?? caseRouterModule.caseRouter;
    auditAccessRouter = auditRouterModule.default ?? auditRouterModule.auditAccessRouter;

    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      // Mock auth middleware population
      req.user = { id: USER_ID, roles: ['admin'] };
      req.headers['x-tenant-id'] = TENANT_ID;
      req.headers['x-user-id'] = USER_ID;
      next();
    });
    app.use('/api/cases', caseRouter);
    app.use('/api/audit-access', auditAccessRouter);
  });

  afterAll(async () => {
    // await pg.end();
  });

  it('logs access when viewing a case', async () => {
    const res = await request(app)
      .get(`/api/cases/${caseId}`)
      .query({ reason: 'viewing case for audit', legalBasis: 'investigation' });

    if (res.status !== 200) {
        console.error('Case view failed:', res.body);
    }
    expect(res.status).toBe(200);

    const { rows } = await pg.query(
      `SELECT * FROM maestro.audit_access_logs
       WHERE tenant_id = $1 AND case_id = $2 AND action = 'view'`,
      [TENANT_ID, caseId]
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].reason).toBe('viewing case for audit');
  });

  it('exports audit logs as CSV and logs the export event', async () => {
    const res = await request(app)
      .post('/api/audit-access/export')
      .send({ format: 'csv', caseId });

    if (res.status !== 200) {
        console.error('Export failed:', res.body);
    }
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('viewing case for audit');
    expect(res.text).toContain(USER_ID);

    // Verify Audit-of-Audit via Mock (since Ledger is mocked in Jest config)
    const { provenanceLedger } = await import('../../provenance/ledger.js');
    expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: TENANT_ID,
        actionType: 'REPORT_GENERATED',
        resourceType: 'AuditReport'
    }));
  });
});
