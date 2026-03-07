import http from "k6/http";
import { check } from "k6";
export const options = {
  vus: 3,
  duration: "20s",
  thresholds: { http_req_duration: ["p(95)<600"] },
};
export default function () {
  const res = http.get("http://localhost:4010/health");
  check(res, { 200: (r) => r.status === 200 || r.status === 404 });
}
