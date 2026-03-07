import http from "k6/http";
import { sleep, check, group } from "k6";

const BASE_URL = __ENV.K6_BASE_URL || "http://localhost:4000";
const TENANT = __ENV.K6_TENANT || "test-perf";
const CUSTOM_HEADERS = __ENV.K6_HEADERS_JSON
  ? JSON.parse(__ENV.K6_HEADERS_JSON)
  : { "x-perf": "true", "x-tenant": TENANT };
const durationFactor = Number(__ENV.K6_DURATION_FACTOR || 1);

const soakDuration = Number(__ENV.K6_SOAK_DURATION_MINUTES || 180) * durationFactor;

export const options = {
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<220"],
  },
  scenarios: {
    soak_open: {
      executor: "constant-arrival-rate",
      rate: 30,
      timeUnit: "1s",
      duration: `${soakDuration}m`,
      preAllocatedVUs: 80,
      maxVUs: 200,
      tags: { journey: "GP-001", run: "soak" },
    },
    soak_reporting: {
      executor: "constant-arrival-rate",
      rate: 15,
      timeUnit: "1s",
      duration: `${soakDuration}m`,
      preAllocatedVUs: 50,
      maxVUs: 120,
      tags: { journey: "GP-003", run: "soak" },
    },
  },
};

function call(path, payload) {
  const params = { headers: { ...CUSTOM_HEADERS, "Content-Type": "application/json" } };
  return payload
    ? http.post(`${BASE_URL}${path}`, JSON.stringify(payload), params)
    : http.get(`${BASE_URL}${path}`, { headers: CUSTOM_HEADERS });
}

function assertResponse(res) {
  check(res, {
    "ok status": (r) => r.status >= 200 && r.status < 400,
  });
}

export default function () {
  group("GP-001 soak", () => {
    const res = call("/api/graph/search?query=soak");
    assertResponse(res);
    sleep(1 * durationFactor);
  });

  group("GP-003 soak", () => {
    const publish = call("/api/reports/publish", { id: `soak-${__ITER}`, tenant: TENANT });
    assertResponse(publish);
    sleep(1 * durationFactor);
  });
}
