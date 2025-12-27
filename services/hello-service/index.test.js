const http = require('http');
const assert = require('assert');
const app = require('./index.js'); // Import the Express app

const testPort = 3001;
const server = http.createServer(app);

server.listen(testPort, () => {
  console.log(`Test server running on port ${testPort}`);

  const options = {
    hostname: 'localhost',
    port: testPort,
    path: '/health',
    method: 'GET',
  };

  const req = http.request(options, (res) => {
    try {
      assert.strictEqual(res.statusCode, 200, `Expected status code 200 but got ${res.statusCode}`);
      console.log('✓ Health endpoint returned 200 OK');
    } catch (error) {
      console.error(`✗ Test failed: ${error.message}`);
      process.exit(1); // Exit with failure code
    } finally {
      server.close(() => {
        console.log('Test server closed.');
      });
    }
  });

  req.on('error', (e) => {
    console.error(`✗ Test request failed: ${e.message}`);
    server.close();
    process.exit(1);
  });

  req.end();
});
