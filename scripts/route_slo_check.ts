import fetch from "node-fetch";

const PROM = process.env.PROM_URL!;
const WINDOWS = { fast: "5m", slow: "1h" };
const BURN_THRESHOLDS = { fast: 14.4, slow: 6.0 };
const SLO = {
  "/search": { p95: 1.2, err: 0.02 },
  "/login": { p95: 0.5, err: 0.01 },
  "/export": { p95: 2.0, err: 0.03 },
};

async function q(expr: string) {
  const r = await fetch(`${PROM}/api/v1/query?query=${encodeURIComponent(expr)}`);
  const json: any = await r.json();
  return Number(json.data.result?.[0]?.value?.[1] || "0");
}

async function burnRate(path: string, window: string, budget: number) {
  const errRatio = await q(
    `sum(rate(http_requests_total{path="${path}",code=~"5.."}[${window}])) / sum(rate(http_requests_total{path="${path}"}[${window}]))`
  );
  return budget > 0 ? errRatio / budget : 0;
}

(async () => {
  const bad: string[] = [];
  for (const [path, b] of Object.entries(SLO)) {
    const p95 = await q(`route:latency:p95{path="${path}"}`);
    const err5m = await q(`route:error_rate:ratio5m{path="${path}"}`);

    const fastBurn = await burnRate(path, WINDOWS.fast, b.err);
    const slowBurn = await burnRate(path, WINDOWS.slow, b.err);

    const burnBreach = fastBurn > BURN_THRESHOLDS.fast || slowBurn > BURN_THRESHOLDS.slow;
    const latencyBreach = p95 > b.p95;
    const errorRateBreach = err5m > b.err;

    if (latencyBreach || errorRateBreach || burnBreach) {
      bad.push(
        [
          `${path}`,
          `p95=${p95.toFixed(2)}s`,
          `err=${(err5m * 100).toFixed(2)}%`,
          `burn5m=${fastBurn.toFixed(1)}x`,
          `burn1h=${slowBurn.toFixed(1)}x`,
        ].join(" ")
      );
    }
  }

  if (bad.length) {
    console.error("❌ Route budgets breached:\n" + bad.join("\n"));
    process.exit(1);
  }
  console.log("✅ All route budgets healthy");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
