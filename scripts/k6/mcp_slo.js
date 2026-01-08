import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: Number(__ENV.VUS || 5),
  duration: __ENV.DURATION || "1m",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

const BASE = __ENV.BASE || "http://localhost:4000/api/maestro/v1";

export default function () {
  // list servers (cheap)
  let res = http.get(`${BASE}/mcp/servers`);
  check(res, { "list 200": (r) => r.status === 200 });
  // Attempt read-only path; write/invoke requires token/admin: mock ok
  sleep(1);
}
