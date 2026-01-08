import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.K6_BASE_URL || "http://localhost:4000";
const TENANT = __ENV.K6_TENANT || "test-perf";
const CUSTOM_HEADERS = __ENV.K6_HEADERS_JSON
  ? JSON.parse(__ENV.K6_HEADERS_JSON)
  : { "x-perf": "true", "x-tenant": TENANT };
const durationFactor = Number(__ENV.K6_DURATION_FACTOR || 1);

export const options = {
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<240", "p(99)<360"],
  },
  scenarios: {
    stress_curve: {
      executor: "ramping-arrival-rate",
      startRate: 20,
      timeUnit: "1s",
      preAllocatedVUs: 50,
      maxVUs: 300,
      stages: [
        { duration: `${5 * durationFactor}m`, target: 120 },
        { duration: `${5 * durationFactor}m`, target: 180 },
        { duration: `${5 * durationFactor}m`, target: 240 },
        { duration: `${3 * durationFactor}m`, target: 0 },
      ],
      tags: { journey: "GP-001", run: "stress" },
    },
  },
};

function perform() {
  const res = http.get(`${BASE_URL}/api/graph/search?query=stress`, { headers: CUSTOM_HEADERS });
  check(res, {
    "status is ok": (r) => r.status >= 200 && r.status < 400,
    "payload looks valid": (r) => {
      try {
        const body = r.json();
        return body && typeof body === "object";
      } catch (_) {
        return false;
      }
    },
  });
}

export default function () {
  perform();
  sleep(0.2 * durationFactor);
}
