import http from "k6/http";
import { sleep, check } from "k6";

const BASE_URL = __ENV.K6_BASE_URL || "http://localhost:4000";
const TENANT = __ENV.K6_TENANT || "test-perf";
const CUSTOM_HEADERS = __ENV.K6_HEADERS_JSON
  ? JSON.parse(__ENV.K6_HEADERS_JSON)
  : { "x-perf": "true", "x-tenant": TENANT };
const durationFactor = Number(__ENV.K6_DURATION_FACTOR || 1);

export const options = {
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<220", "p(99)<340"],
  },
  scenarios: {
    sudden_spike: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1s",
      preAllocatedVUs: 30,
      maxVUs: 200,
      stages: [
        { duration: `${1 * durationFactor}m`, target: 30 },
        { duration: `${2 * durationFactor}m`, target: 180 },
        { duration: `${2 * durationFactor}m`, target: 180 },
        { duration: `${3 * durationFactor}m`, target: 60 },
        { duration: `${2 * durationFactor}m`, target: 0 },
      ],
      tags: { journey: "GP-003", run: "spike" },
    },
  },
};

export default function () {
  const res = http.post(
    `${BASE_URL}/api/reports/publish`,
    JSON.stringify({ id: "spike-report", tenant: TENANT }),
    {
      headers: { ...CUSTOM_HEADERS, "Content-Type": "application/json" },
    }
  );
  check(res, {
    "publish ok": (r) => r.status >= 200 && r.status < 400,
  });
  sleep(0.5 * durationFactor);
}
