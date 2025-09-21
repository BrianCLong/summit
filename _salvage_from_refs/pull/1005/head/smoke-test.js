#!/usr/bin/env node

const http = require('http');

async function testEndpoint(url, description) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      console.log(`✅ ${description}: ${res.statusCode}`);
      resolve(res.statusCode < 400);
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${description}: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log(`⏰ ${description}: Timeout`);
      req.destroy();
      resolve(false);
    });
  });
}

async function testGraphQL() {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      query: '{ __typename }'
    });
    
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (parsed.data && parsed.data.__typename === 'Query') {
            console.log('✅ GraphQL API: Working correctly');
            resolve(true);
          } else {
            console.log('❌ GraphQL API: Invalid response');
            resolve(false);
          }
        } catch (e) {
          console.log('❌ GraphQL API: Parse error');
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ GraphQL API: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('⏰ GraphQL API: Timeout');
      req.destroy();
      resolve(false);
    });
    
    req.write(data);
    req.end();
  });
}

async function runSmokeTests() {
  console.log('🚀 Running IntelGraph Platform Smoke Tests...\n');
  
  const tests = [
    () => testEndpoint('http://localhost:3001', 'Frontend (Client)'),
    () => testEndpoint('http://localhost:4000', 'Backend (Server)'),
    () => testGraphQL()
  ];
  
  const results = await Promise.all(tests.map(test => test()));
  const passed = results.filter(Boolean).length;
  
  console.log(`\n📊 Test Results: ${passed}/${results.length} passed`);
  
  if (passed === results.length) {
    console.log('🎉 All smoke tests passed! Application is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please check the logs above.');
    process.exit(1);
  }
}

runSmokeTests().catch(console.error);