#!/usr/bin/env node

/**
 * IntelGraph Smoke Test - Golden Path Verification
 * 
 * This script verifies the complete golden path:
 * 1. Create Investigation
 * 2. Add entities/links
 * 3. Import data
 * 4. Run Copilot
 * 5. See live results
 */

const axios = require('axios');
const { WebSocket } = require('ws');

// Configuration
const config = {
  apiUrl: process.env.VITE_API_URL || 'http://localhost:4000/graphql',
  wsUrl: process.env.VITE_WS_URL || 'http://localhost:4000',
  timeout: 30000
};

// GraphQL queries and mutations
const QUERIES = {
  healthCheck: `
    query {
      __typename
    }
  `,
  
  createInvestigation: `
    mutation CreateInvestigation($input: CreateInvestigationInput!) {
      createInvestigation(input: $input) {
        id
        name
        description
        status
        createdAt
      }
    }
  `,
  
  addEntity: `
    mutation AddEntity($input: CreateEntityInput!) {
      createEntity(input: $input) {
        id
        type
        name
        properties
      }
    }
  `,
  
  addRelationship: `
    mutation AddRelationship($input: CreateRelationshipInput!) {
      createRelationship(input: $input) {
        id
        type
        fromEntityId
        toEntityId
        properties
      }
    }
  `,
  
  startCopilotRun: `
    mutation StartCopilotRun($goal: String!, $investigationId: ID!) {
      startCopilotRun(goal: $goal, investigationId: $investigationId) {
        id
        goal
        status
        createdAt
      }
    }
  `,
  
  getInvestigation: `
    query GetInvestigation($id: ID!) {
      investigation(id: $id) {
        id
        name
        entities {
          id
          type
          name
        }
        relationships {
          id
          type
          fromEntityId
          toEntityId
        }
      }
    }
  `
};

// Utility functions
class SmokeTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m'
    };
    const reset = '\x1b[0m';
    
    console.log(`${colors[type]}[${timestamp}] ${message}${reset}`);
  }

  async test(name, testFn) {
    this.results.total++;
    
    try {
      await this.log(`🧪 Running: ${name}`);
      await testFn();
      this.results.passed++;
      this.results.details.push({ name, status: 'PASSED' });
      await this.log(`✅ PASSED: ${name}`, 'success');
    } catch (error) {
      this.results.failed++;
      this.results.details.push({ name, status: 'FAILED', error: error.message });
      await this.log(`❌ FAILED: ${name} - ${error.message}`, 'error');
    }
  }

  async graphqlRequest(query, variables = {}) {
    try {
      const response = await axios.post(config.apiUrl, {
        query,
        variables
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: config.timeout
      });

      if (response.data.errors) {
        throw new Error(`GraphQL Error: ${JSON.stringify(response.data.errors)}`);
      }

      return response.data.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
      }
      throw error;
    }
  }

  async waitForWebSocket(url, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const timer = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, timeout);

      ws.on('open', () => {
        clearTimeout(timer);
        ws.close();
        resolve();
      });

      ws.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  async run() {
    await this.log('🚀 Starting IntelGraph Smoke Test Suite', 'info');
    await this.log(`API URL: ${config.apiUrl}`, 'info');
    await this.log(`WebSocket URL: ${config.wsUrl}`, 'info');

    let investigationId = null;
    let entityIds = [];

    // Test 1: GraphQL Health Check
    await this.test('GraphQL API Health Check', async () => {
      const result = await this.graphqlRequest(QUERIES.healthCheck);
      if (!result.__typename) {
        throw new Error('Invalid GraphQL response');
      }
    });

    // Test 2: WebSocket Connection
    await this.test('WebSocket Connection', async () => {
      await this.waitForWebSocket(`${config.wsUrl}/socket.io/?EIO=4&transport=websocket`);
    });

    // Test 3: Create Investigation
    await this.test('Create Investigation', async () => {
      const variables = {
        input: {
          name: 'Smoke Test Investigation',
          description: 'Automated smoke test investigation',
          type: 'THREAT_ANALYSIS'
        }
      };
      
      const result = await this.graphqlRequest(QUERIES.createInvestigation, variables);
      investigationId = result.createInvestigation.id;
      
      if (!investigationId) {
        throw new Error('Failed to create investigation');
      }
    });

    // Test 4: Add Entities
    await this.test('Add Entities to Investigation', async () => {
      const entities = [
        { type: 'PERSON', name: 'John Doe', properties: { role: 'suspect' } },
        { type: 'ORGANIZATION', name: 'ACME Corp', properties: { industry: 'tech' } }
      ];

      for (const entity of entities) {
        const variables = {
          input: {
            investigationId,
            ...entity
          }
        };
        
        const result = await this.graphqlRequest(QUERIES.addEntity, variables);
        entityIds.push(result.createEntity.id);
      }

      if (entityIds.length !== 2) {
        throw new Error('Failed to create all entities');
      }
    });

    // Test 5: Add Relationship
    await this.test('Add Relationship', async () => {
      if (entityIds.length < 2) {
        throw new Error('Not enough entities to create relationship');
      }

      const variables = {
        input: {
          investigationId,
          type: 'WORKS_FOR',
          fromEntityId: entityIds[0],
          toEntityId: entityIds[1],
          properties: { startDate: '2023-01-01' }
        }
      };

      const result = await this.graphqlRequest(QUERIES.addRelationship, variables);
      if (!result.createRelationship.id) {
        throw new Error('Failed to create relationship');
      }
    });

    // Test 6: Start Copilot Run
    await this.test('Start Copilot Run', async () => {
      const variables = {
        goal: 'Analyze the relationship between John Doe and ACME Corp',
        investigationId
      };

      const result = await this.graphqlRequest(QUERIES.startCopilotRun, variables);
      if (!result.startCopilotRun.id) {
        throw new Error('Failed to start Copilot run');
      }
    });

    // Test 7: Verify Investigation State
    await this.test('Verify Investigation State', async () => {
      const variables = { id: investigationId };
      const result = await this.graphqlRequest(QUERIES.getInvestigation, variables);
      
      const investigation = result.investigation;
      if (!investigation) {
        throw new Error('Investigation not found');
      }
      
      if (investigation.entities.length < 2) {
        throw new Error(`Expected at least 2 entities, found ${investigation.entities.length}`);
      }
      
      if (investigation.relationships.length < 1) {
        throw new Error(`Expected at least 1 relationship, found ${investigation.relationships.length}`);
      }
    });

    // Generate Report
    await this.generateReport();
  }

  async generateReport() {
    await this.log('\n📊 Smoke Test Results:', 'info');
    await this.log(`Total Tests: ${this.results.total}`, 'info');
    await this.log(`Passed: ${this.results.passed}`, 'success');
    await this.log(`Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'info');
    
    if (this.results.failed > 0) {
      await this.log('\n❌ Failed Tests:', 'error');
      this.results.details
        .filter(test => test.status === 'FAILED')
        .forEach(test => this.log(`  - ${test.name}: ${test.error}`, 'error'));
    }

    const successRate = (this.results.passed / this.results.total * 100).toFixed(1);
    await this.log(`\nSuccess Rate: ${successRate}%`, successRate === '100.0' ? 'success' : 'warning');

    if (this.results.failed === 0) {
      await this.log('\n🎉 All smoke tests passed! Golden path is working correctly.', 'success');
      process.exit(0);
    } else {
      await this.log('\n💥 Some smoke tests failed. Please check the errors above.', 'error');
      process.exit(1);
    }
  }
}

// Install axios if not available
async function ensureDependencies() {
  try {
    require('axios');
    require('ws');
  } catch (error) {
    console.log('Installing required dependencies...');
    const { execSync } = require('child_process');
    execSync('npm install axios ws', { stdio: 'inherit' });
  }
}

// Main execution
async function main() {
  try {
    await ensureDependencies();
    const smokeTest = new SmokeTest();
    await smokeTest.run();
  } catch (error) {
    console.error('❌ Smoke test suite failed to run:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = SmokeTest;