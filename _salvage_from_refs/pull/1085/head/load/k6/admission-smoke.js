import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  scenarios: {
    gold_mix:   { executor: "constant-vus", vus: 10, duration: "5m", env: { TIER: "gold" } },
    silver_mix: { executor: "constant-vus", vus: 10, duration: "5m", env: { TIER: "silver" } }
  }
};

function payload(exploration) {
  return JSON.stringify({
    tenantId: __ENV.TIER + "_tenant",
    tenantTier: __ENV.TIER,
    expert: ["graph_ops","rag_retrieval","osint_analysis"][Math.floor(Math.random()*3)],
    isExploration: exploration
  });
}

export default function () {
  const url = __ENV.SCHEDULER_URL + "/enqueue";
  // Alternate exploration/exploitation to exercise caps
  const exploration = Math.random() < 0.1;
  const res = http.post(url, payload(exploration), { headers: { "Content-Type": "application/json" } });
  check(res, { "status 2xx/202/429/403": (r) => [200,201,202,429,403].includes(r.status) });
  sleep(0.5);
}
