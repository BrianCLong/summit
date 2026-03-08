"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestHarness = exports.TestHarness = void 0;
const app_js_1 = require("../src/app.js");
class TestHarness {
    app = null;
    mockAuthToken = 'mock-test-token';
    mockUser = {
        sub: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
        tenant_id: 'tenant-123',
    };
    container = null;
    async init(options = {}) {
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
        }
        else if (options.mockNeo4j) {
            // Mock logic handled via Jest mocks in test setup
        }
        this.app = await (0, app_js_1.createApp)();
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
exports.TestHarness = TestHarness;
const createTestHarness = async (options = {}) => {
    const harness = new TestHarness();
    await harness.init(options);
    return harness;
};
exports.createTestHarness = createTestHarness;
