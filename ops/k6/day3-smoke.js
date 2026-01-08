// ops/k6/day3-smoke.js
import http from "k6/http";
import { sleep, check } from "k6";

export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    checks: ["rate>0.95"],
  },
};

export default function () {
  const h = { headers: { "idempotency-key": `${__VU}-${__ITER}` } };

  // Stubs - Replace with actual URLs in environment
  const LAC_URL = __ENV.LAC || "http://localhost:3000";
  const PLEDGER_URL = __ENV.PLEDGER || "http://localhost:8000";

  check(http.get(`${LAC_URL}/healthz`), { "lac 200": (r) => r.status === 200 });
  check(
    http.post(`${PLEDGER_URL}/claim`, JSON.stringify({ evidenceId: "ev", assertion: "ok" }), h),
    { "claim 201": (r) => r.status === 201 }
  );

  sleep(1);
}
