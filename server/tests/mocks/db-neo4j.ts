// Mock for server/src/db/neo4j.ts

const mockSession = {
  run: async () => ({ records: [] }),
  close: async () => {},
  beginTransaction: () => ({
    run: async () => ({ records: [] }),
    commit: async () => {},
    rollback: async () => {},
  }),
};

const mockDriver = {
  session: () => mockSession,
  close: async () => {},
  verifyConnectivity: async () => {},
};

export async function initializeNeo4jDriver(): Promise<void> {
  // No-op in tests
}

export function getNeo4jDriver() {
  return mockDriver;
}

export function isNeo4jMockMode(): boolean {
  return true;
}

export async function closeNeo4jDriver(): Promise<void> {
  // No-op in tests
}

export function onNeo4jDriverReady(_callback: (event: { reason: string }) => void): void {
  // No-op in tests
}

export const neo = {
  session: () => mockSession,
  run: async (_query: string, _params?: any) => ({ records: [] }),
};

type SessionLike = {
  run: (cypher: string, params?: any, txConfig?: any) => Promise<any>;
};

export function instrumentSession<T extends SessionLike>(session: T): T {
  return session;
}

export default {
  initializeNeo4jDriver,
  getNeo4jDriver,
  isNeo4jMockMode,
  closeNeo4jDriver,
  onNeo4jDriverReady,
  neo,
  instrumentSession,
};
