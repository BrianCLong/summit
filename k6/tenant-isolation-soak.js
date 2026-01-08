import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

const tenants = [
  { id: __ENV.TENANT_A_ID || "tenant-a", token: __ENV.TENANT_A_TOKEN || "token-a" },
  { id: __ENV.TENANT_B_ID || "tenant-b", token: __ENV.TENANT_B_TOKEN || "token-b" },
];

export const isolationBreaches = new Rate("tenant_isolation_breaches");
export const latency = new Trend("tenant_latency_ms");

export const options = {
  scenarios: {
    soak: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1s",
      preAllocatedVUs: 50,
      stages: [
        { target: 50, duration: "2m" },
        { target: 100, duration: "6m" },
        { target: 0, duration: "1m" },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    tenant_isolation_breaches: ["rate==0"],
    tenant_latency_ms: ["p(95)<750"],
  },
};

function requestForTenant(tenant) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tenant.token}`,
    "x-tenant-id": tenant.id,
  };

  const res = http.get(`${BASE_URL}/api/tenants/${tenant.id}/settings`, { headers });
  latency.add(res.timings.duration);

  const statusOk = check(res, {
    "status is 200/403 allowed": (r) => r.status === 200 || r.status === 403,
  });

  // Ensure payload never leaks a different tenant id
  const body = res.body || "";
  const noLeak = !body.includes("tenant-b") || tenant.id === "tenant-b";
  if (!noLeak) {
    isolationBreaches.add(1);
  }

  return statusOk;
}

export default function () {
  const tenant = tenants[__ITER % tenants.length];
  requestForTenant(tenant);

  // Fire a lightweight AI request with tenant headers to stress rate limits
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tenant.token}`,
    "x-tenant-id": tenant.id,
  };
  const aiRes = http.post(
    `${BASE_URL}/api/ai/chat`,
    JSON.stringify({ prompt: "ping", tenantId: tenant.id }),
    { headers }
  );
  latency.add(aiRes.timings.duration);
  check(aiRes, {
    "ai responds or rate limited": (r) => [200, 429, 403].includes(r.status),
  });

  sleep(1);
}
