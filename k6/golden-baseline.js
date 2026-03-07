import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate } from "k6/metrics";

const BASE_URL = __ENV.K6_BASE_URL || "http://localhost:4000";
const TENANT = __ENV.K6_TENANT || "test-perf";
const CUSTOM_HEADERS = __ENV.K6_HEADERS_JSON
  ? JSON.parse(__ENV.K6_HEADERS_JSON)
  : { "x-perf": "true", "x-tenant": TENANT };
const durationFactor = Number(__ENV.K6_DURATION_FACTOR || 1);

const failureRate = new Rate("check_failure_rate");

export const options = {
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<200", "p(99)<320"],
    check_failure_rate: ["rate<0.01"],
  },
  scenarios: {
    baseline_open_model: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1s",
      preAllocatedVUs: 20,
      maxVUs: 150,
      stages: [
        { duration: `${30 * durationFactor}s`, target: 60 },
        { duration: `${10 * durationFactor}m`, target: 80 },
        { duration: `${2 * durationFactor}m`, target: 0 },
      ],
      tags: { journey: "GP-001", run: "baseline" },
    },
    baseline_closed_model: {
      executor: "ramping-vus",
      startVUs: 10,
      stages: [
        { duration: `${2 * durationFactor}m`, target: 40 },
        { duration: `${8 * durationFactor}m`, target: 60 },
        { duration: `${2 * durationFactor}m`, target: 0 },
      ],
      tags: { journey: "GP-002", run: "baseline" },
    },
    baseline_reporting: {
      executor: "constant-arrival-rate",
      rate: 25,
      timeUnit: "1s",
      duration: `${8 * durationFactor}m`,
      preAllocatedVUs: 30,
      maxVUs: 80,
      tags: { journey: "GP-003", run: "baseline" },
    },
  },
};

function request(path, payload = null, params = {}) {
  const url = `${BASE_URL}${path}`;
  const mergedHeaders = { ...CUSTOM_HEADERS, ...(params.headers || {}) };
  const reqParams = { ...params, headers: mergedHeaders };

  return payload ? http.post(url, payload, reqParams) : http.get(url, reqParams);
}

function validateResponse(res, thresholdMs) {
  const ok = check(res, {
    "status is 2xx/3xx": (r) => r.status >= 200 && r.status < 400,
    [`p95 under ${thresholdMs}ms`]: (r) => r.timings.duration < thresholdMs,
    "json shape": (r) => {
      try {
        const body = r.json();
        return body && typeof body === "object";
      } catch (_) {
        return false;
      }
    },
  });
  if (!ok) {
    failureRate.add(1);
  }
}

export default function () {
  group("GP-001 interactive graph", () => {
    const search = request("/api/graph/search?query=node");
    validateResponse(search, 180);
    sleep(1 * durationFactor);

    const expand = request("/api/graph/expand?id=seed-node");
    validateResponse(expand, 180);
    sleep(0.5 * durationFactor);

    const note = request(
      "/api/notes",
      JSON.stringify({ text: "perf baseline note", tenant: TENANT }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    validateResponse(note, 200);
  });

  group("GP-002 case ingestion", () => {
    const upload = request(
      "/api/cases",
      JSON.stringify({ title: "perf ingestion", tenant: TENANT }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    validateResponse(upload, 220);
    sleep(1 * durationFactor);

    const monitor = request("/api/cases/status?id=perf-ingestion");
    validateResponse(monitor, 220);
  });

  group("GP-003 reporting", () => {
    const draft = request("/api/reports/draft");
    validateResponse(draft, 250);
    sleep(0.5 * durationFactor);

    const publish = request(
      "/api/reports/publish",
      JSON.stringify({ id: "perf-draft", tenant: TENANT }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    validateResponse(publish, 250);
  });
}
