import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURATION || "5m",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500"],
  },
};

export default function () {
  const base = __ENV.BASE || "http://localhost:8080";
  const url = `${base}/api/maestro/v1/invoke`;
  const res = http.post(url, JSON.stringify({ input: { ping: "pong" } }), {
    headers: { "Content-Type": "application/json" },
    timeout: "30s",
  });
  check(res, { "status 2xx": (r) => r.status >= 200 && r.status < 300 });
  sleep(0.5);
}
