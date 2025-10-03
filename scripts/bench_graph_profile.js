#!/usr/bin/env node
// Dedicated PROFILE runner to avoid touching existing bench_graph.js
const neo4j = require("neo4j-driver");
const url = process.env.NEO4J_URL || "bolt://localhost:7687";
const user = process.env.NEO4J_USER || "neo4j";
const pass = process.env.NEO4J_PASS || "password";
const query = process.argv.includes("--query")
  ? process.argv[process.argv.indexOf("--query")+1]
  : "MATCH (n)-[r]->(m) RETURN count(r) LIMIT 1000";
const WARMUP = (parseInt(process.env.WARMUP_S||"5")*1000);
const DURATION = (parseInt(process.env.DURATION_S||"30")*1000);

const p = q => q[Math.floor(0.95*(q.length-1))] || 0;
const avg = a => a.reduce((x,y)=>x+y,0)/(a.length||1);

(async () => {
  const driver = neo4j.driver(url, neo4j.auth.basic(user, pass));
  const session = driver.session();
  const stats = [];
  const lat = [];
  const start = Date.now();
  const runOnce = async () => {
    const t0 = Date.now();
    const res = await session.run("PROFILE " + query);
    const t1 = Date.now();
    const summ = res.summary;
    const prof = summ && summ.profile ? summ.profile : null;
    const dbHits = prof?.arguments?.DbHits ?? prof?.arguments?.["DbHits"] ?? null;
    return { ms: (t1 - t0), dbHits, rows: res.records.length };
  };
  while (Date.now()-start < WARMUP) await runOnce();
  const t1 = Date.now(); let iters=0;
  while (Date.now()-t1 < DURATION) {
    const s = await runOnce(); iters++;
    lat.push(s.ms); stats.push(s);
  }
  await session.close(); await driver.close();
  lat.sort((a,b)=>a-b);
  console.log(JSON.stringify({
    name: "graph-query-neo4j-profile",
    target: url, query, iters,
    latency_ms_p95: p(lat),
    profile: { avgDbHits: Math.round(avg(stats.map(s=>s.dbHits||0))), avgRows: Math.round(avg(stats.map(s=>s.rows||0))) }
  }));
})();