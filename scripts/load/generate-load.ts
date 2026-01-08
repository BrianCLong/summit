import http from "http";
import https from "https";
import { randomUUID } from "crypto";

/**
 * Summit Load Generator
 * Usage: npx tsx scripts/load/generate-load.ts [mode] [duration_sec] [concurrency]
 * Modes: steady, burst, adversarial
 */

const TARGET_HOST = process.env.TARGET_HOST || "localhost";
const TARGET_PORT = parseInt(process.env.TARGET_PORT || "3000", 10);
const PROTOCOL = process.env.TARGET_PROTOCOL || "http";

const mode = process.argv[2] || "steady";
const durationSec = parseInt(process.argv[3] || "10", 10);
const baseConcurrency = parseInt(process.argv[4] || "10", 10);

console.log(
  `Starting Load Test: Mode=${mode}, Duration=${durationSec}s, BaseConcurrency=${baseConcurrency}`
);

interface Metrics {
  requests: number;
  success: number;
  failures: number;
  latencies: number[];
  statusCodes: Record<number, number>;
}

const metrics: Metrics = {
  requests: 0,
  success: 0,
  failures: 0,
  latencies: [],
  statusCodes: {},
};

const agent = new http.Agent({ keepAlive: true, maxSockets: 1000 });

function makeRequest(path: string, method: string = "GET", body?: any): Promise<void> {
  return new Promise((resolve) => {
    const start = process.hrtime();

    const options: http.RequestOptions = {
      hostname: TARGET_HOST,
      port: TARGET_PORT,
      path: path,
      method: method,
      agent: agent,
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-ID": "load-test-tenant", // Simulate a tenant
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const [seconds, nanoseconds] = process.hrtime(start);
        const durationMs = seconds * 1000 + nanoseconds / 1e6;

        metrics.requests++;
        metrics.latencies.push(durationMs);
        metrics.statusCodes[res.statusCode || 0] =
          (metrics.statusCodes[res.statusCode || 0] || 0) + 1;

        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
          metrics.success++;
        } else {
          metrics.failures++;
        }
        resolve();
      });
    });

    req.on("error", (e) => {
      metrics.requests++;
      metrics.failures++;
      metrics.statusCodes[0] = (metrics.statusCodes[0] || 0) + 1; // 0 = network error
      console.error(`Request error: ${e.message}`);
      resolve();
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runWorker(id: number, endTime: number) {
  while (Date.now() < endTime) {
    let path = "/health"; // Default endpoint
    let delay = 100; // Default think time

    if (mode === "adversarial") {
      // Mix of fast and slow (simulated) requests
      if (Math.random() > 0.9) {
        // "Heavy" request
        path = "/api/predictive/forecast?complexity=high";
        // Note: In a real test, this path should exist or be mocked to return slowly
      } else {
        path = "/health";
      }
      delay = Math.random() * 50;
    } else if (mode === "burst") {
      // Burst logic: sleep then hammer
      const burstCycle = Date.now() % 5000;
      if (burstCycle < 1000) {
        delay = 10; // Rapid fire
      } else {
        delay = 500; // Cooldown
      }
    }

    await makeRequest(path);
    await new Promise((r) => setTimeout(r, delay));
  }
}

async function main() {
  const endTime = Date.now() + durationSec * 1000;
  const workers = [];

  for (let i = 0; i < baseConcurrency; i++) {
    workers.push(runWorker(i, endTime));
  }

  await Promise.all(workers);

  // Calculate stats
  const sortedLatencies = metrics.latencies.sort((a, b) => a - b);
  const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0;
  const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
  const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0;

  const result = {
    config: { mode, durationSec, baseConcurrency },
    metrics: {
      totalRequests: metrics.requests,
      successRate: (metrics.success / metrics.requests) * 100,
      rps: metrics.requests / durationSec,
      p50,
      p95,
      p99,
      statusCodes: metrics.statusCodes,
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
