import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// Metrics
const errorRate = new Rate("errors");
const duration = new Trend("duration");

// Config
export const options = {
  stages: [
    { duration: "30s", target: 10 }, // Ramp up
    { duration: "1m", target: 10 }, // Stay
    { duration: "10s", target: 0 }, // Ramp down
  ],
  thresholds: {
    errors: ["rate<0.01"], // <1% errors
    http_req_duration: ["p(95)<500"], // 95% of requests < 500ms
  },
};

export default function () {
  const url = __ENV.TARGET_URL || "http://localhost:3000";

  const res = http.get(url);

  check(res, {
    "status is 200": (r) => r.status === 200,
  }) || errorRate.add(1);

  duration.add(res.timings.duration);
  sleep(1);
}
