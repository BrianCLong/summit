import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    steady: {
      executor: "constant-vus",
      vus: 10,
      duration: "45s",
      gracefulStop: "5s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<750"],
  },
};

export default function () {
  const target = __ENV.LOAD_TEST_TARGET || "http://127.0.0.1:8000";
  const res = http.get(target);
  check(res, {
    "status OK": (r) => r.status === 200,
  });
  sleep(0.25);
}
