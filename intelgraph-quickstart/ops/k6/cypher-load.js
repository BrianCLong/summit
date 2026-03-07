import http from "k6/http";
import { check } from "k6";
// Assumes a simple Cypher HTTP endpoint proxy in API for test-only
export const options = {
  vus: 20,
  duration: "2m",
  thresholds: { http_req_duration: ["p(95)<300"] },
};
export default function () {
  const res = http.post(
    "http://localhost:4000/test/cypher",
    JSON.stringify({
      cypher: 'MATCH (p:Person)-[]-(n:Person) WHERE p.id="p-1" RETURN n LIMIT 50',
    }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(res, { ok: (r) => r.status === 200 });
}
