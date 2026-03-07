import http from "k6/http";
import { check, sleep, group } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

// ----------------------------------------------------------------------------
// METRICS
// ----------------------------------------------------------------------------
const rate_limit_exceeded = new Counter("rate_limit_exceeded_total");
const plan_job_failures = new Rate("plan_job_failures");
const plan_job_duration = new Trend("plan_job_duration");
const query_failures = new Rate("query_failures");
const query_duration = new Trend("query_duration");

// ----------------------------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------------------------
export const options = {
  scenarios: {
    // 1. Sustained Load: Validates "Operating Envelope"
    sustained_load: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1m",
      preAllocatedVUs: 10,
      maxVUs: 50,
      stages: [
        { target: 100, duration: "1m" }, // Ramp to 100 RPM (Pro Tier)
        { target: 100, duration: "2m" }, // Sustain
        { target: 0, duration: "30s" }, // Ramp down
      ],
    },
    // 2. Burst/Spike: Validates degradation & backpressure
    burst_load: {
      executor: "ramping-arrival-rate",
      startRate: 0,
      timeUnit: "1s", // Requests per SECOND
      preAllocatedVUs: 20,
      maxVUs: 100,
      startTime: "4m", // Start after sustained load finishes (roughly)
      stages: [
        { target: 20, duration: "10s" }, // Rapid spike to 20 RPS (1200 RPM) -> Should trigger limits if configured low
        { target: 0, duration: "10s" },
      ],
    },
  },
  thresholds: {
    // SLO assertions
    query_duration: ["p(95)<250"], // Read-only Latency < 250ms
    plan_job_duration: ["p(95)<5000"], // Planning Latency < 5s
    query_failures: ["rate<0.001"], // 99.9% Availability
    plan_job_failures: ["rate<0.005"], // 99.5% Success
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";

// ----------------------------------------------------------------------------
// MOCK DATA
// ----------------------------------------------------------------------------
// Assuming a test tenant ID or using a header simulation
const HEADERS_FREE = {
  "Content-Type": "application/json",
  Authorization: "Bearer test-token-free-tier", // Mock token
  "X-Tenant-Id": "tenant-free-001",
};

const HEADERS_PRO = {
  "Content-Type": "application/json",
  Authorization: "Bearer test-token-pro-tier",
  "X-Tenant-Id": "tenant-pro-001",
};

const GRAPHQL_QUERY = JSON.stringify({
  query: `
    query AgentContext {
      __schema {
        queryType { name }
      }
    }
  `,
});

const PLANNING_PAYLOAD = JSON.stringify({
  templateId: "tpl-agent-planning-v1", // Mock template ID
  input: {
    goal: "Analyze market trends",
    constraints: ["low-latency"],
  },
});

// ----------------------------------------------------------------------------
// TEST FUNCTION
// ----------------------------------------------------------------------------
export default function () {
  // We alternate between Read-Only and Planning to simulate a mix
  // 80% Reads, 20% Writes/Plans

  const headers = Math.random() > 0.5 ? HEADERS_PRO : HEADERS_FREE;

  group("Read-Only Query", () => {
    if (Math.random() < 0.8) {
      const res = http.post(`${BASE_URL}/graphql`, GRAPHQL_QUERY, {
        headers,
        tags: { type: "query" },
      });

      query_duration.add(res.timings.duration);

      check(res, {
        "status is 200": (r) => r.status === 200,
        "not throttled": (r) => r.status !== 429,
      });

      // DEGRADATION CHECK: Ensure we don't return 500s under load
      check(res, {
        "graceful degradation": (r) =>
          r.status !== 500 && r.status !== 502 && r.status !== 503 && r.status !== 504,
      });

      if (res.status === 429) {
        rate_limit_exceeded.add(1);
      } else if (res.status !== 200) {
        query_failures.add(1);
      } else {
        query_failures.add(0);
      }
    }
  });

  group("Planning Job", () => {
    if (Math.random() >= 0.8) {
      // Use the maestro endpoint identified in server/src/routes/maestro.ts
      const res = http.post(`${BASE_URL}/api/maestro/runs`, PLANNING_PAYLOAD, {
        headers,
        tags: { type: "planning" },
      });

      plan_job_duration.add(res.timings.duration);

      check(res, {
        "status is 201": (r) => r.status === 201,
        "not throttled": (r) => r.status !== 429,
      });

      // DEGRADATION CHECK
      check(res, {
        "graceful degradation": (r) => r.status !== 500 && r.status !== 502,
      });

      if (res.status === 429) {
        rate_limit_exceeded.add(1);
      } else if (res.status !== 201) {
        // Note: If auth fails with 401/403, it counts as failure for the test setup but maybe not for the system availability if credentials are bad.
        // For now, we assume tokens are valid mock tokens.
        plan_job_failures.add(1);
      } else {
        plan_job_failures.add(0);
      }
    }
  });

  sleep(0.5); // Think time
}
