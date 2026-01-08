import http from "k6/http";
import { check, sleep } from "k6";
export const options = { vus: 5, duration: "1m" };
const url = "http://localhost:4000/graphql";
export default function () {
  const q = JSON.stringify({ query: '{ searchPersons(q:"a", limit:5){ id name } }' });
  const res = http.post(url, q, {
    headers: { "Content-Type": "application/json", "x-tenant": "demo-tenant" },
  });
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(1);
}
