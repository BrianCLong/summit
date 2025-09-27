import http from "k6/http";
import { check, sleep } from "k6";

export const options = { vus: 10, duration: "30s" };

export default function () {
  const url = `${__ENV.BASE || "http://localhost:8080"}/assistant/stream`;
  const res = http.post(url, JSON.stringify({ input: "stream me" }), {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${__ENV.TOKEN || ""}` },
    timeout: "60s",
  });
  check(res, {
    "200 ok": (r) => r.status === 200,
    "contains phrase": (r) => r.body.includes("I understand your query"),
  });
  sleep(0.2);
}
