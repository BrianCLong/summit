#!/usr/bin/env node

const http = require('http');

console.log('🚀 Running IntelGraph Platform Integration Tests...\n');

const tests = [
  {
    name: '🌐 Frontend Health Check',
    test: () => testEndpoint('http://localhost:3001/', 'Frontend'),
  },
  {
    name: '⚙️  Backend Health Check',
    test: () => testEndpoint('http://localhost:4000/', 'Backend', false),
  },
  {
    name: '🔍 GraphQL Introspection',
    test: () =>
      testGraphQL(
        '{ __schema { queryType { name } } }',
        'Schema introspection',
      ),
  },
  {
    name: '📊 Entities Query',
    test: () =>
      testGraphQL('{ entities(limit: 2) { id type props } }', 'Entities query'),
  },
  {
    name: '👤 Users Query',
    test: () =>
      testGraphQL('{ users(limit: 2) { id email username } }', 'Users query'),
  },
  {
    name: '🎯 Single Entity Query',
    test: () =>
      testGraphQL(
        '{ entity(id: "mock-entity-1") { id type props } }',
        'Single entity query',
      ),
  },
  {
    name: '🔍 Filtered Entities Query',
    test: () =>
      testGraphQL(
        '{ entities(type: "PERSON") { id type } }',
        'Filtered entities query',
      ),
  },
  {
    name: '📱 Frontend Asset Loading',
    test: () => testEndpoint('http://localhost:3001/vite.svg', 'Vite assets'),
  },
];

async function testEndpoint(url, name, expectOK = true) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      const success = expectOK ? res.statusCode === 200 : res.statusCode < 500;
      console.log(`${success ? '✅' : '❌'} ${name}: ${res.statusCode}`);
      resolve(success);
    });

    req.on('error', (err) => {
      console.log(`❌ ${name}: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(3000, () => {
      req.destroy();
      console.log(`⏰ ${name}: Timeout`);
      resolve(false);
    });
  });
}

async function testGraphQL(query, name) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ query });

    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => (responseData += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          const success = !parsed.errors && parsed.data;
          console.log(
            `${success ? '✅' : '❌'} ${name}: ${success ? 'Success' : parsed.errors?.[0]?.message || 'Failed'}`,
          );
          resolve(success);
        } catch (e) {
          console.log(`❌ ${name}: Parse error`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${name}: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(3000, () => {
      req.destroy();
      console.log(`⏰ ${name}: Timeout`);
      resolve(false);
    });

    req.write(data);
    req.end();
  });
}

async function runAllTests() {
  const results = [];

  for (const { name, test } of tests) {
    console.log(`Testing: ${name}`);
    const result = await test();
    results.push({ name, success: result });
  }

  const passed = results.filter((r) => r.success).length;
  const total = results.length;

  console.log(`\n📊 Integration Test Results:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);

  if (passed === total) {
    console.log('\n🎉 ALL INTEGRATION TESTS PASSED!');
    console.log(
      '🚀 IntelGraph Platform is fully functional and ready for use.',
    );
    console.log(`\n🌐 Frontend: http://localhost:3001`);
    console.log(`🔗 GraphQL: http://localhost:4000/graphql`);
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. See details above.');
    console.log('\nFailed tests:');
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.name}`);
      });
    process.exit(1);
  }
}

runAllTests().catch(console.error);
