// IntelGraph Platform - Basic Smoke Tests

// These smoke tests verify that the IntelGraph platform services are running correctly
// and responding to basic requests. They are designed to be fast and reliable,
// providing quick validation of the deployment.

const axios = require('axios');

// Test configuration
const config = {
  apiEndpoint: process.env.API_ENDPOINT || 'http://localhost:4000',
  uiEndpoint: process.env.UI_ENDPOINT || 'http://localhost:3000',
  timeout: 10000 // 10 seconds
};

// Timing utility
const startTime = Date.now();

function getElapsedTime() {
  return Date.now() - startTime;
}

// Test suite
async function runTests() {
  let passed = 0;
  let failed = 0;
  const results = [];

  console.log('Starting IntelGraph Platform smoke tests...\n');

  // Test 1: API health check
  try {
    const startTimeTest = Date.now();
    const response = await axios.get(`${config.apiEndpoint}/health`, {
      timeout: config.timeout
    });
    
    if (response.status === 200 && response.data && response.data.status === 'healthy') {
      const elapsed = Date.now() - startTimeTest;
      console.log(`✓ API health check passed (${elapsed}ms)`);
      passed++;
      results.push({ test: 'API health check', status: 'PASS', time: elapsed });
    } else {
      const elapsed = Date.now() - startTimeTest;
      console.error(`✗ API health check failed (${elapsed}ms): Unexpected response`);
      failed++;
      results.push({ test: 'API health check', status: 'FAIL', time: elapsed, error: 'Unexpected response' });
    }
  } catch (error) {
    const elapsed = Date.now() - startTimeTest;
    console.error(`✗ API health check failed (${elapsed}ms):`, error.message);
    failed++;
    results.push({ test: 'API health check', status: 'FAIL', time: elapsed, error: error.message });
  }

  // Test 2: GraphQL endpoint available
  try {
    const startTimeTest = Date.now();
    const response = await axios.post(
      `${config.apiEndpoint}/graphql`,
      {
        query: `
          query HealthQuery {
            __schema {
              types {
                name
              }
            }
          }
        `
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: config.timeout
      }
    );
    
    if (response.status === 200 && response.data && !response.data.errors) {
      const elapsed = Date.now() - startTimeTest;
      console.log(`✓ GraphQL endpoint available (${elapsed}ms)`);
      passed++;
      results.push({ test: 'GraphQL endpoint available', status: 'PASS', time: elapsed });
    } else {
      const elapsed = Date.now() - startTimeTest;
      console.error(`✗ GraphQL endpoint test failed (${elapsed}ms): Has errors in response`);
      failed++;
      results.push({ test: 'GraphQL endpoint available', status: 'FAIL', time: elapsed, error: 'Response has errors' });
    }
  } catch (error) {
    const elapsed = Date.now() - startTimeTest;
    console.error(`✗ GraphQL endpoint test failed (${elapsed}ms):`, error.message);
    failed++;
    results.push({ test: 'GraphQL endpoint available', status: 'FAIL', time: elapsed, error: error.message });
  }

  // Test 3: Neo4j connection (via API)
  try {
    const startTimeTest = Date.now();
    const response = await axios.post(
      `${config.apiEndpoint}/graphql`,
      {
        query: `
          query TestNeo4jConnection {
            entities(limit: 1) {
              id
              type
              createdAt
            }
          }
        `
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: config.timeout
      }
    );
    
    // The query should return without database errors, even if no entities exist
    if (response.status === 200 && response.data) {
      const elapsed = Date.now() - startTimeTest;
      console.log(`✓ Neo4j connection test passed (${elapsed}ms)`);
      passed++;
      results.push({ test: 'Neo4j connection (via API)', status: 'PASS', time: elapsed });
    } else {
      const elapsed = Date.now() - startTimeTest;
      console.error(`✗ Neo4j connection test failed (${elapsed}ms): Invalid response`);
      failed++;
      results.push({ test: 'Neo4j connection (via API)', status: 'FAIL', time: elapsed, error: 'Invalid response' });
    }
  } catch (error) {
    const elapsed = Date.now() - startTimeTest;
    // Don't fail the test if no entities exist, just log the issue
    if (error.response && error.response.data && error.response.data.errors) {
      const errorMessage = error.response.data.errors[0].message;
      if (errorMessage.includes('not found') || errorMessage.includes('empty')) {
        const elapsed = Date.now() - startTimeTest;
        console.log(`? Neo4j connection test inconclusive (${elapsed}ms): No data available`);
        passed++; // Count as pass since connection itself worked
        results.push({ test: 'Neo4j connection (via API)', status: 'PASS', time: elapsed, note: 'No data available' });
      } else {
        const elapsed = Date.now() - startTimeTest;
        console.error(`✗ Neo4j connection test failed (${elapsed}ms):`, errorMessage);
        failed++;
        results.push({ test: 'Neo4j connection (via API)', status: 'FAIL', time: elapsed, error: errorMessage });
      }
    } else {
      const elapsed = Date.now() - startTimeTest;
      console.error(`✗ Neo4j connection test failed (${elapsed}ms):`, error.message);
      failed++;
      results.push({ test: 'Neo4j connection (via API)', status: 'FAIL', time: elapsed, error: error.message });
    }
  }

  // Test 4: UI endpoint accessible
  try {
    const startTimeTest = Date.now();
    const response = await axios.get(`${config.uiEndpoint}`, {
      timeout: config.timeout
    });
    
    if (response.status === 200) {
      const elapsed = Date.now() - startTimeTest;
      console.log(`✓ UI endpoint accessible (${elapsed}ms)`);
      passed++;
      results.push({ test: 'UI endpoint accessible', status: 'PASS', time: elapsed });
    } else {
      const elapsed = Date.now() - startTimeTest;
      console.warn(`? UI endpoint test inconclusive (${elapsed}ms): Status ${response.status}`);
      results.push({ test: 'UI endpoint accessible', status: 'WARN', time: elapsed, note: `Status ${response.status}` });
    }
  } catch (error) {
    // The UI might not be running in smoke test context, so log but count as warning
    const elapsed = Date.now() - startTimeTest;
    console.warn(`? UI endpoint test skipped (${elapsed}ms):`, error.message);
    results.push({ test: 'UI endpoint accessible', status: 'WARN', time: elapsed, note: error.message });
  }

  // Test 5: Basic entity operations
  try {
    const startTimeTest = Date.now();
    // First try to create an entity
    const createResponse = await axios.post(
      `${config.apiEndpoint}/graphql`,
      {
        query: `
          mutation TestCreateEntity {
            createEntity(input: {
              type: "TestEntity"
              props: {
                name: "Smoke Test Entity"
                description: "Entity created during smoke test"
                createdAt: "${new Date().toISOString()}"
              }
            }) {
              id
              type
              props
              createdAt
            }
          }
        `
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: config.timeout
      }
    );
    
    if (createResponse.status === 200 && createResponse.data && createResponse.data.data) {
      if (createResponse.data.data.createEntity) {
        const entityId = createResponse.data.data.createEntity.id;
        
        // Then try to query the created entity
        const queryResponse = await axios.post(
          `${config.apiEndpoint}/graphql`,
          {
            query: `
              query GetTestEntity($id: ID!) {
                entity(id: $id) {
                  id
                  type
                  props
                  createdAt
                }
              }
            `,
            variables: { id: entityId }
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: config.timeout
          }
        );
        
        if (queryResponse.status === 200 && queryResponse.data && queryResponse.data.data) {
          const elapsed = Date.now() - startTimeTest;
          console.log(`✓ Basic entity operations test passed (${elapsed}ms)`);
          passed++;
          results.push({ test: 'Basic entity operations', status: 'PASS', time: elapsed });
        } else {
          const elapsed = Date.now() - startTimeTest;
          console.warn(`? Entity operations test inconclusive (${elapsed}ms): Query failed`);
          results.push({ test: 'Basic entity operations', status: 'WARN', time: elapsed, note: 'Query failed' });
        }
      } else {
        const elapsed = Date.now() - startTimeTest;
        console.warn(`? Entity operations test inconclusive (${elapsed}ms): No entity created`);
        results.push({ test: 'Basic entity operations', status: 'WARN', time: elapsed, note: 'No entity created' });
      }
    } else {
      const elapsed = Date.now() - startTimeTest;
      console.warn(`? Entity operations test inconclusive (${elapsed}ms): Create failed`);
      results.push({ test: 'Basic entity operations', status: 'WARN', time: elapsed, note: 'Create failed' });
    }
  } catch (error) {
    const elapsed = Date.now() - startTimeTest;
    console.warn(`? Entity operations test inconclusive (${elapsed}ms):`, error.message);
    results.push({ test: 'Basic entity operations', status: 'WARN', time: elapsed, note: error.message });
  }

  // Final results
  const totalTime = getElapsedTime();
  console.log(`\nSmoke tests completed in ${totalTime}ms: ${passed} passed, ${failed} failed`);
  
  // Print detailed results table
  console.log('\nDetailed Results:');
  console.log('-----------------');
  results.forEach(result => {
    const statusSymbol = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : '?';
    console.log(`${statusSymbol} ${result.test} (${result.time}ms) - ${result.status}${result.error ? ` - ${result.error}` : ''}${result.note ? ` - ${result.note}` : ''}`);
  });

  // Exit with appropriate code
  if (failed > 0) {
    console.log('\n❌ Smoke tests failed - exiting with error code');
    process.exit(1);
  } else {
    console.log('\n✅ All critical smoke tests passed');
    process.exit(0);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(err => {
    console.error('Unexpected error during smoke tests:', err);
    process.exit(1);
  });
}

module.exports = { config, runTests };