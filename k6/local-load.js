import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const latencyTrend = new Trend("latency");
const errorRate = new Rate("errors");

export const options = {
  thresholds: {
    http_req_duration: ["p(95)<200"],
    errors: ["rate<0.01"],
  },
  stages: [
    { duration: "10s", target: 50 }, // Ramp up to 50 VUs
    { duration: "20s", target: 50 }, // Hold
    { duration: "10s", target: 0 }, // Ramp down
  ],
};

export default function () {
  // Target local server
  const res = http.get("http://localhost:4000/health");

  check(res, {
    "status is 200": (r) => r.status === 200,
  });

  latencyTrend.add(res.timings.duration);
  errorRate.add(res.status !== 200);

  sleep(0.1); // Small think time
}
