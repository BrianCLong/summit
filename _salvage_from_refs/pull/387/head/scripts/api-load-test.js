/**
 * Simple API load test script
 * Usage: node scripts/api-load-test.js <endpoint> <requests> <concurrency>
 */

const axios = require("axios");

const endpoint = process.argv[2] || "http://localhost:4000/health";
const totalRequests = parseInt(process.argv[3] || "10000", 10);
const concurrency = parseInt(process.argv[4] || "100", 10);

let current = 0;

async function worker() {
  while (current < totalRequests) {
    const requestNumber = current++;
    try {
      await axios.get(endpoint);
    } catch {
      // ignore errors
    }
  }
}

async function run() {
  const start = Date.now();
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  const duration = Date.now() - start;
  console.log(
    `Completed ${totalRequests} requests to ${endpoint} with concurrency ${concurrency} in ${duration}ms`,
  );
}

run().catch((err) => {
  console.error("Load test failed", err);
  process.exit(1);
});
