import { jest } from '@jest/globals';
import fs from 'fs';

const logFile = '/tmp/debug_pg_mock.txt';
try { fs.appendFileSync(logFile, `PG MOCK LOADED at ${new Date().toISOString()}\n`); } catch (_) { }

const mockUser = {
  id: 'mock-user-id',
  email: 'guardrails-test@example.com',
  username: 'guardrails-test',
  password_hash: 'hashed',
  first_name: 'Guard',
  last_name: 'Rails',
  role: 'ADMIN',
  is_active: true,
  created_at: new Date(),
  tenant_id: 'public',
};

export const mockClient = {
  query: jest.fn().mockImplementation((text: string, _params: any[]) => {
    try { fs.appendFileSync(logFile, `QUERY: ${text}\n`); } catch (_) { }
    const normalizedText = text.trim().toUpperCase();

    if (normalizedText.includes('SELECT COUNT(*)')) {
      return Promise.resolve({ rowCount: 1, rows: [{ count: '0' }] });
    }

    if (normalizedText.includes('SELECT VALUE FROM SYSTEM_KV_STORE')) {
      return Promise.resolve({ rowCount: 1, rows: [{ value: { status: 'public', maxUsers: 1000, maxTenants: 100, allowedDomains: ['*'], blockedDomains: [] } }] });
    }

    if (normalizedText.includes('SELECT ID FROM USERS')) {
      return Promise.resolve({ rowCount: 0, rows: [] });
    }

    if (normalizedText.includes('INSERT INTO USERS')) {
      return Promise.resolve({ rowCount: 1, rows: [mockUser] });
    }

    if (normalizedText.includes('INSERT INTO USER_SESSIONS')) {
      return Promise.resolve({ rowCount: 1, rows: [] });
    }

    if (normalizedText.includes('UPDATE USERS')) {
      return Promise.resolve({ rowCount: 1, rows: [mockUser] });
    }

    if (normalizedText.includes('FROM USERS')) {
      return Promise.resolve({ rowCount: 1, rows: [mockUser] });
    }

    if (normalizedText.includes('PROVENANCE_LEDGER_V2')) {
      return Promise.resolve({
        rowCount: 1,
        rows: [{
          id: 'mock-prov-id',
          tenant_id: 'public',
          sequence_number: 1,
          current_hash: 'mock-hash',
          timestamp: new Date()
        }]
      });
    }

    if (normalizedText.includes('INSERT INTO AUDIT_EVENTS')) {
      return Promise.resolve({ rowCount: 1, rows: [] });
    }

    return Promise.resolve({ rowCount: 0, rows: [] });
  }),
  release: jest.fn(),
  on: jest.fn(),
  end: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(undefined),
};

export const mockPool = {
  query: jest.fn().mockImplementation((text: string, params: any[]) => mockClient.query(text, params)),
  read: jest.fn().mockImplementation((text: string, params: any[]) => mockClient.query(text, params)),
  write: jest.fn().mockImplementation((text: string, params: any[]) => mockClient.query(text, params)),
  connect: jest.fn().mockResolvedValue(mockClient),
  on: jest.fn(),
  end: jest.fn().mockResolvedValue(undefined),
  totalCount: 0,
  idleCount: 0,
  waitingCount: 0,
};

export class Pool {
  constructor() { return mockPool; }
}

export class Client {
  constructor() { return mockClient; }
}

export const types = {
  setTypeParser: jest.fn(),
  getTypeParser: jest.fn().mockReturnValue((val: string) => val),
};

export default { Pool, Client, types, mockPool, mockClient };
