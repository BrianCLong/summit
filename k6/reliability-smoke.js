import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 1,
  duration: "45s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1000"],
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || "http://localhost:4000";
  const headers = __ENV.AUTH_TOKEN ? { Authorization: `Bearer ${__ENV.AUTH_TOKEN}` } : {};

  const health = http.get(`${baseUrl}/health`, { headers });
  check(health, {
    "health is ok": (r) => r.status === 200,
  });

  const metrics = http.get(`${baseUrl}/metrics`, { headers });
  check(metrics, {
    "metrics exposed": (r) =>
      r.status === 200 &&
      r.body.includes("reliability_request_duration_seconds") &&
      r.body.includes("tenant_query_budget_hits_total"),
  });

  const graphHealth = http.get(`${baseUrl}/ai/nl-graph-query/health`, {
    headers,
  });
  check(graphHealth, {
    "graph query health ok": (r) => r.status === 200,
  });

  const ragHealth = http.get(`${baseUrl}/graphrag/health`, { headers });
  check(ragHealth, {
    "graphrag health ok": (r) => r.status === 200,
  });

  sleep(1);
}
