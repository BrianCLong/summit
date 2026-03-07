import http from "k6/http";
import { sleep, check } from "k6";

export const options = {
  vus: 4,
  duration: "2m",
  thresholds: {
    http_req_duration: ["p(95)<150"],
    http_req_failed: ["rate<0.01"],
  },
};

const base = __ENV.GATEWAY_URL || "http://localhost:4000";

export default function () {
  const res = http.post(
    `${base}/graphql`,
    JSON.stringify({
      query: "{ health }",
    }),
    {
      headers: { "Content-Type": "application/json" },
      timeout: "5s",
    }
  );

  check(res, {
    "status 200": (r) => r.status === 200,
    "duration under budget": (r) => r.timings.duration < 150,
  });

  sleep(1);
}
