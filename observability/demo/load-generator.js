#!/usr/bin/env node

/**
 * Load Generator for SLO Demo
 *
 * Generates realistic traffic patterns with controlled error rates
 * to demonstrate SLO alerting in action.
 */

const http = require('http');
const { URL } = require('url');

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:4000';
const COPILOT_URL = process.env.COPILOT_URL || 'http://localhost:8002';
const ERROR_RATE = parseFloat(process.env.ERROR_RATE || '0.05'); // 5% error rate
const RPS = parseInt(process.env.RPS || '10'); // 10 requests per second
const SPIKE_PROBABILITY = parseFloat(process.env.SPIKE_PROBABILITY || '0.1'); // 10% chance of spike

let requestCount = 0;
let successCount = 0;
let errorCount = 0;

const QUERIES = [
  'show me all entities',
  'count nodes',
  'find threat actors',
  'list indicators',
  'show me recent events',
];

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = http;

    const reqOptions = {
      method: options.method || 'GET',
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: options.headers || {},
      timeout: 5000,
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function sendCopilotQuery() {
  const query = QUERIES[Math.floor(Math.random() * QUERIES.length)];

  try {
    const payload = JSON.stringify({ nl: query });

    // Randomly inject errors based on ERROR_RATE
    const shouldFail = Math.random() < ERROR_RATE;
    const queryToSend = shouldFail
      ? JSON.stringify({ nl: 'delete everything' })  // Policy violation
      : payload;

    const response = await makeRequest(`${COPILOT_URL}/copilot/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(queryToSend),
      },
      body: queryToSend,
    });

    requestCount++;
    if (response.status >= 200 && response.status < 400) {
      successCount++;
    } else {
      errorCount++;
    }

    if (requestCount % 100 === 0) {
      console.log(`[Copilot] Requests: ${requestCount}, Success: ${successCount}, Errors: ${errorCount} (${((errorCount / requestCount) * 100).toFixed(1)}%)`);
    }
  } catch (error) {
    requestCount++;
    errorCount++;
  }
}

async function sendAPIRequest() {
  try {
    const response = await makeRequest(`${TARGET_URL}/health`);

    requestCount++;
    if (response.status >= 200 && response.status < 400) {
      successCount++;
    } else {
      errorCount++;
    }
  } catch (error) {
    requestCount++;
    errorCount++;
  }
}

async function runLoadGeneration() {
  console.log('Starting load generator...');
  console.log(`  Target: ${TARGET_URL}`);
  console.log(`  Copilot: ${COPILOT_URL}`);
  console.log(`  RPS: ${RPS}`);
  console.log(`  Error Rate: ${(ERROR_RATE * 100).toFixed(1)}%`);
  console.log('');

  const intervalMs = 1000 / RPS;

  setInterval(async () => {
    // Randomly spike load
    const isSpike = Math.random() < SPIKE_PROBABILITY;
    const numRequests = isSpike ? RPS * 3 : 1;

    if (isSpike) {
      console.log('🔥 SPIKE: Generating 3x load');
    }

    for (let i = 0; i < numRequests; i++) {
      // Mix of copilot and API requests
      if (Math.random() < 0.7) {
        sendCopilotQuery().catch(() => {});
      } else {
        sendAPIRequest().catch(() => {});
      }
    }
  }, intervalMs);

  // Stats reporter
  setInterval(() => {
    const successRate = requestCount > 0 ? ((successCount / requestCount) * 100).toFixed(2) : 0;
    console.log(`Stats: Total=${requestCount}, Success=${successCount} (${successRate}%), Errors=${errorCount}`);
  }, 30000); // Every 30 seconds
}

runLoadGeneration();
