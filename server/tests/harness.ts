import express from 'express';
import { createApp } from '../src/app.js';
import { cfg } from '../src/config.js';
// import { Neo4jContainer } from '@testcontainers/neo4j'; // Uncomment when using real integration

export interface TestHarnessOptions {
  mockAuth?: boolean;
  mockNeo4j?: boolean;
  useContainer?: boolean;
}

export class TestHarness {
  public app: express.Application | null = null;
  public mockAuthToken = 'mock-test-token';
  public mockUser = {
    sub: 'test-user-id',
    email: 'test@example.com',
    role: 'admin',
    tenant_id: 'tenant-123',
  };
  private container: any = null;

  async init(options: TestHarnessOptions = {}) {
    // Override config for testing
    process.env.NODE_ENV = 'test';
    process.env.PORT = '0'; // Random port
    process.env.LOG_LEVEL = 'silent'; // Reduce noise

    if (options.useContainer) {
       // Example logic for starting a Neo4j container
       // this.container = await new Neo4jContainer('neo4j:5.15.0').withPassword('password').start();
       // process.env.NEO4J_URI = this.container.getBoltUrl();
       // process.env.NEO4J_USERNAME = 'neo4j';
       // process.env.NEO4J_PASSWORD = 'password';
       console.log('Using Neo4j container (mock logic for now)');
    } else if (options.mockNeo4j) {
      // Mock logic handled via Jest mocks in test setup
    }

    this.app = await createApp();
  }

  getAuthHeader() {
    return { Authorization: `Bearer ${this.mockAuthToken}` };
  }

  async teardown() {
    // Close connections
    if (this.container) {
        // await this.container.stop();
    }
  }
}

export const createTestHarness = async (options: TestHarnessOptions = {}) => {
  const harness = new TestHarness();
  await harness.init(options);
  return harness;
};
