cat << 'INNER_EOF' > packages/summit-coggeo/src/bin/runToyPipeline.ts
import path from "node:path";
import fs from "node:fs";

import { createDuckDBClient } from "../storage/duckdb/duckdbClient.js";
import { CogGeoDuckStore } from "../storage/duckdb/coggeoDuckStore.js";

import { normalizeObservation } from "../ingest/normalizeObservation.js";
import { extractSignals } from "../extract/extractSignals.js";
import { clusterNarratives } from "../features/clusterNarratives.js";
import { computeTerrainCells } from "../features/computeTerrain.js";
import { detectStorms } from "../models/stormDetector.js";
import { buildCogGeoWriteSet } from "../graph/buildCogGeoWriteSet.js";

import { IntelGraphAdapterStub } from "../graph/intelGraphAdapterStub.js";
import type { ExplainPayload } from "../api/types.js";

type WriteSetEnvelope = {
  id: string;
  ts: string;
  nodes: Array<{ type: string; id: string; data: any }>;
  edges: Array<{ type: string; from: string; to: string; data: any }>;
  provenance: { collector: string; hash: string; models: string[] };

  coggeo: any;
};

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function wrapEnvelope(args: { ts: string; coggeo: any }): WriteSetEnvelope {
  return {
    id: \`wsEnvelope:\${args.coggeo.id}\`,
    ts: args.ts,
    nodes: args.coggeo.nodes,
    edges: args.coggeo.edges,
    provenance: args.coggeo.provenance,
    coggeo: args.coggeo,
  };
}

async function main() {
  const ts = nowIso();

  const dataDir = path.resolve(process.cwd(), "data/coggeo");
  ensureDir(dataDir);

  const duckPath = path.join(dataDir, "coggeo.duckdb");
  const parquetPath = path.join(dataDir, "terrain_cells.parquet");
  const intelOutDir = path.join(dataDir, "intelgraph_stub");

  const duck = createDuckDBClient({ path: duckPath });
  const conn = await duck.connect();
  const store = new CogGeoDuckStore(conn, { parquetPath });
  await store.init();

  const raw = [
    {
      ts,
      source: "toy:feed",
      url: "https://example.test/post/1",
      content: "Breaking: alleged scandal is trending. People furious about waste and corruption.",
      lang: "en",
      geo: { h3: "8928308280fffff", country: "US", region: "CO" },
    },
    {
      ts,
      source: "toy:feed",
      url: "https://example.test/post/2",
      content: "New claims spreading fast. Commenters say institutions can’t be trusted.",
      lang: "en",
      geo: { h3: "8928308280bffff", country: "US", region: "CO" },
    },
  ];

  const observations = raw.map((r) => normalizeObservation(r, "toy-runner"));

  const extracts = await Promise.all(observations.map((o) => extractSignals({ id: o.id, ts: o.ts, content: o.content })));
  const narrativeCands = extracts.flatMap((e) => e.narratives);

  const { narratives } = clusterNarratives(narrativeCands);

  const narrativeId = narratives[0]?.id ?? "nar:stub";
  const tsBucket = "hourly:2026-03-05T07";

  const terrain = [
    computeTerrainCells({
      tsBucket,
      narrativeId,
      h3: raw[0]!.geo!.h3!,
      volume: 80,
      emotionArousal: 0.85,
      contradiction: 0.15,
      windU: 0.2,
      windV: 0.1,
    }),
    computeTerrainCells({
      tsBucket,
      narrativeId,
      h3: raw[1]!.geo!.h3!,
      volume: 120,
      emotionArousal: 0.92,
      contradiction: 0.25,
      windU: 0.25,
      windV: 0.05,
    }),
  ];

  const storms = detectStorms(terrain, ts, 0.85);

  const explains: ExplainPayload[] = storms.map((s) => ({
    id: s.explain_ref,
    kind: "storm",
    summary: \`Toy storm: narrative=\${s.narrative_id} severity=\${s.severity.toFixed(2)}\`,
    drivers: [
      { name: "Pressure spike", delta: Math.max(...terrain.map((c) => c.pressure)), evidence: s.cells },
      { name: "Emotional temperature", delta: Math.max(...terrain.map((c) => c.temperature)), evidence: s.cells },
    ],
    confidence: Math.max(0.05, s.severity),
    provenance: { models: ["toy-runner:v1"] },
  }));

  const coggeoWS = buildCogGeoWriteSet({
    ts,
    collector: "toy-runner",
    models: ["toy-runner:v1"],
    observations,
    narratives,
    terrain,
    storms,
    explains,
  });

  const envelope = wrapEnvelope({ ts, coggeo: coggeoWS });

  await store.upsertNarratives(
    narratives.map(n => ({
      id: n.id,
      title: n.title,
      summary: n.summary,
      first_seen: n.first_seen,
      last_seen: n.last_seen,
      confidence: n.confidence,
    })),
  );

  await store.upsertStorms(
    storms.map(s => ({
      id: s.id,
      narrative_id: s.narrative_id,
      start_ts: s.start_ts,
      end_ts: s.end_ts,
      severity: s.severity,
      explain_ref: s.explain_ref,
    })),
  );

  await store.upsertExplains(explains);

  await store.upsertTerrain(
    terrain.map(c => ({
      id: c.id,
      ts_bucket: c.ts_bucket,
      h3: c.h3,
      narrative_id: c.narrative_id,
      pressure: c.pressure,
      temperature: c.temperature,
      wind_u: c.wind_u,
      wind_v: c.wind_v,
      turbulence: c.turbulence,
      storm_score: c.storm_score,
    })),
  );
  await store.exportTerrainToParquet();

  for (const cell of terrain) {
    await store.linkCellToObs(cell.id, observations.map(o => o.id));
  }

  const intel = new IntelGraphAdapterStub({ outDir: intelOutDir });
  const res = await intel.writeArtifacts(envelope);

  console.log("Toy pipeline complete.");
  console.log("Narrative:", narrativeId);
  console.log("Terrain cells written:", terrain.length);
  console.log("Storms detected:", storms.length);
  console.log("Parquet:", parquetPath);
  console.log("DuckDB:", duckPath);
  console.log("IntelGraph stub output:", res.outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/bin/devServer.ts
import express from "express";
import path from "node:path";
import fs from "node:fs";

import { createDuckDBClient } from "../storage/duckdb/duckdbClient.js";
import { CogGeoDuckStore } from "../storage/duckdb/coggeoDuckStore.js";

import { createTerrainTileHandler } from "../api/tiles/terrainTileHandler.js";
import { createNarrativesHandler, createStormsHandler } from "../api/coggeoDuckHandlers.js";
import { createExplainDuckHandler } from "../api/explain/explainDuckHandler.js";

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

async function main() {
  const app = express();

  const dataDir = path.resolve(process.cwd(), "data/coggeo");
  ensureDir(dataDir);

  const duckPath = path.join(dataDir, "coggeo.duckdb");
  const parquetPath = path.join(dataDir, "terrain_cells.parquet");

  const duck = createDuckDBClient({ path: duckPath });
  const conn = await duck.connect();

  const store = new CogGeoDuckStore(conn, { parquetPath });
  await store.init();

  const terrainStore = { listCells: (args: { tsBucket: string; narrativeId: string }) => store.listTerrain(args) };

  app.get("/coggeo/narratives", createNarrativesHandler(store));
  app.get("/coggeo/storms", createStormsHandler(store));
  app.get("/coggeo/explain/:explainId", createExplainDuckHandler(store));
  app.get("/coggeo/terrain/tiles/:z/:x/:y", createTerrainTileHandler(terrainStore));

  app.get("/coggeo/health", async (_req, res) => {
    const narratives = await store.listNarratives();
    const narrativeId = narratives[0]?.id ?? "nar:demo-corruption-backlash";
    res.json({
      ok: true,
      duckdb: duckPath,
      parquet: parquetPath,
      hint: "Run the toy pipeline to populate: node dist/bin/runToyPipeline.js",
      endpoints: {
        narratives: "/coggeo/narratives",
        storms: \`/coggeo/storms?timeRange=24h&narrativeId=\${encodeURIComponent(narrativeId)}\`,
        exampleExplain: "/coggeo/explain/explain:cell:hourly:2026-03-05T07:8928308280fffff:nar:demo-corruption-backlash",
        exampleTileGeoJSON:
          \`/coggeo/terrain/tiles/5/6/12?narrativeId=\${encodeURIComponent(narrativeId)}&tsBucket=\${encodeURIComponent("hourly:2026-03-05T07")}&layer=storm&format=geojson\`,
        exampleTileMVT:
          \`/coggeo/terrain/tiles/5/6/12?narrativeId=\${encodeURIComponent(narrativeId)}&tsBucket=\${encodeURIComponent("hourly:2026-03-05T07")}&layer=storm&format=mvt\`
      }
    });
  });

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(\`CogGeo dev server listening on http://localhost:\${port}\`);
    console.log(\`Health: http://localhost:\${port}/coggeo/health\`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/bin/smokeTest.ts
const BASE = process.env.COGGEO_BASE_URL ?? "http://localhost:3000";

async function getJson(path: string) {
  const r = await fetch(\`\${BASE}\${path}\`);
  if (!r.ok) throw new Error(\`\${path} failed: \${r.status}\`);
  return await r.json();
}

async function main() {
  const health = await getJson("/coggeo/health");
  console.log("health.ok =", health.ok);

  const narratives = await getJson("/coggeo/narratives");
  console.log("narratives =", narratives);

  const storms = await getJson("/coggeo/storms?timeRange=24h");
  console.log("storms =", storms);

  if (Array.isArray(storms) && storms.length > 0 && storms[0]?.explain_ref) {
    const explain = await getJson(\`/coggeo/explain/\${encodeURIComponent(storms[0].explain_ref)}\`);
    console.log("storm explain =", explain);
  }

  if (Array.isArray(narratives) && narratives.length > 0) {
    const narrativeId = narratives[0].id;
    const tsBucket = "hourly:2026-03-05T07";
    const tile = await fetch(
      \`\${BASE}/coggeo/terrain/tiles/5/6/12?narrativeId=\${encodeURIComponent(narrativeId)}&tsBucket=\${encodeURIComponent(tsBucket)}&layer=storm&format=geojson\`,
    );
    console.log("tile status =", tile.status, "content-type =", tile.headers.get("content-type"));
    const tileJson = await tile.json();
    console.log("tile features =", tileJson.features?.length ?? 0);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/bin/demoBootstrap.ts
import { spawn } from "node:child_process";

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", shell: true });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(\`\${cmd} \${args.join(" ")} exited \${code}\`))));
  });
}

async function main() {
  await run("npm", ["run", "build"]);
  await run("npm", ["run", "coggeo:toy"]);
  await run("npm", ["run", "coggeo:devserver"]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
INNER_EOF

cat << 'INNER_EOF' > packages/summit-coggeo/src/bin/demoCompose.ts
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type ProcSpec = {
  name: string;
  cmd: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
};

function runProc(spec: ProcSpec): ChildProcess {
  const child = spawn(spec.cmd, spec.args, {
    cwd: spec.cwd,
    env: { ...process.env, ...(spec.env ?? {}) },
    stdio: "inherit",
    shell: true,
  });

  child.on("exit", (code) => {
    console.log(\`[\${spec.name}] exited with code \${code}\`);
  });

  return child;
}

async function runOnce(cmd: string, args: string[], cwd?: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      env: process.env,
      stdio: "inherit",
      shell: true,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(\`\${cmd} \${args.join(" ")} failed with code \${code}\`));
    });
  });
}

async function main() {
  const coggeoDir = process.cwd();
  const repoRoot = path.resolve(coggeoDir, "../..");

  const uiDevCmd = process.env.COGGEO_UI_DEV_CMD || "";
  const skipBuild = process.env.COGGEO_SKIP_BUILD === "1";

  if (!skipBuild) {
    console.log("[compose] building coggeo package");
    await runOnce("npm", ["run", "build"], coggeoDir);
  }

  console.log("[compose] seeding toy data");
  await runOnce("node", ["--enable-source-maps", "dist/bin/runToyPipeline.js"], coggeoDir);

  console.log("[compose] starting dev server");
  const serverProc = runProc({
    name: "coggeo-server",
    cmd: "node",
    args: ["--enable-source-maps", "dist/bin/devServer.js"],
    cwd: coggeoDir,
  });

  let uiProc: ChildProcess | null = null;
  if (uiDevCmd) {
    const [cmd, ...args] = uiDevCmd.split(" ");
    console.log("[compose] starting UI dev command:", uiDevCmd);
    uiProc = runProc({
      name: "ui-dev",
      cmd,
      args,
      cwd: repoRoot,
    });
  }

  let rerunTimer: NodeJS.Timeout | null = null;
  const watchPath = path.join(coggeoDir, "src");

  console.log("[compose] watching", watchPath, "for toy pipeline changes");

  fs.watch(watchPath, { recursive: true }, (_eventType, filename) => {
    if (!filename) return;
    if (!String(filename).includes("runToyPipeline") && !String(filename).includes("extractSignals") && !String(filename).includes("computeTerrain")) {
      return;
    }

    if (rerunTimer) clearTimeout(rerunTimer);
    rerunTimer = setTimeout(async () => {
      try {
        console.log("[compose] rebuilding after change:", filename);
        await runOnce("npm", ["run", "build"], coggeoDir);
        console.log("[compose] rerunning toy pipeline");
        await runOnce("node", ["--enable-source-maps", "dist/bin/runToyPipeline.js"], coggeoDir);
        console.log("[compose] toy data refreshed");
      } catch (err) {
        console.error("[compose] refresh failed", err);
      }
    }, 300);
  });

  const shutdown = () => {
    console.log("[compose] shutting down");
    serverProc.kill();
    if (uiProc) uiProc.kill();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
INNER_EOF
