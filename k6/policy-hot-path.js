import http from "k6/http";
import { sleep, check } from "k6";

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: { http_req_duration: ["p(95)<500"] },
};

export default function () {
  const res = http.post(
    "http://localhost:4000/policy/explain",
    JSON.stringify({ query: "{ secureAction }" }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(1);
}
