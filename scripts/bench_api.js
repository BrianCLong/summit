#!/usr/bin/env node
const http = require("http");

const TARGET = process.env.BENCH_URL || "http://localhost:4000/health";
const DURATION_MS = (parseInt(process.env.DURATION_S || "30") * 1000);
const WARMUP_MS = (parseInt(process.env.WARMUP_S || "5") * 1000);

const results = [];
function once() {
  const t0 = Date.now();
  return new Promise((resolve) => {
    const req = http.get(TARGET, (res) => {
      res.resume();
      res.on("end", () => resolve({ ok: res.statusCode < 500, ms: Date.now() - t0 }));
    });
    req.on("error", () => resolve({ ok: false, ms: Date.now() - t0 }));
  });
}

(async () => {
  const start = Date.now();
  // Warmup
  while (Date.now() - start < WARMUP_MS) await once();
  let ok = 0, err = 0;
  const t1 = Date.now();
  while (Date.now() - t1 < DURATION_MS) {
    /* eslint-disable no-await-in-loop */
    const r = await once();
    r.ok ? ok++ : err++;
    results.push(r.ms);
  }
  results.sort((a,b)=>a-b);
  const p = q => results[Math.floor(q*(results.length-1))] || 0;
  const summary = {
    target: TARGET,
    samples: results.length,
    latency_ms_p50: p(0.5),
    latency_ms_p95: p(0.95),
    latency_ms_p99: p(0.99),
    error_rate: (err/(ok+err||1)),
    throughput_rps: results.length / (DURATION_MS/1000),
    start_ts: new Date(start).toISOString(),
    end_ts: new Date().toISOString()
  };
  console.log(JSON.stringify(summary));
})();