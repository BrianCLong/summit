#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Deterministic lineage/provenance report generator.
 *
 * Inputs:
 * - LINEAGE_EVENTS_DIR: directory containing OpenLineage events as JSON files (one event per file or NDJSON)
 * - LINEAGE_POLICY_PATH: optional policy JSON (thresholds)
 * - GITHUB_SHA: commit SHA used for artifact pathing
 *
 * Outputs (deterministic):
 * - artifacts/lineage/<sha>/metrics.json
 * - artifacts/lineage/<sha>/gaps.json
 * - artifacts/lineage/<sha>/report.md
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const SHA = process.env.GITHUB_SHA || process.env.GIT_SHA || "local";
const EVENTS_DIR = process.env.LINEAGE_EVENTS_DIR || "artifacts/lineage-events";
const POLICY_PATH = process.env.LINEAGE_POLICY_PATH || "scripts/lineage/report/lineage_policy.json";
const OUT_DIR = path.join("artifacts", "lineage", SHA);

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readTextIfExists(p) {
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8");
}

function stableCompare(a, b) {
  // Deterministic, codepoint order
  return a < b ? -1 : a > b ? 1 : 0;
}

function stableStringify(obj) {
  // Deterministic JSON stringify: sorts keys recursively.
  const seen = new WeakSet();
  const sorter = (x) => {
    if (x && typeof x === "object") {
      if (seen.has(x)) return "[Circular]";
      seen.add(x);
      if (Array.isArray(x)) return x.map(sorter);
      const keys = Object.keys(x).sort(stableCompare);
      const out = {};
      for (const k of keys) out[k] = sorter(x[k]);
      return out;
    }
    return x;
  };
  return JSON.stringify(sorter(obj), null, 2) + "\n";
}

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function listFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const walk = (d) => {
    const ents = fs.readdirSync(d, { withFileTypes: true });
    ents.sort((a, b) => stableCompare(a.name, b.name));
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) out.push(p);
    }
  };
  walk(dir);
  return out;
}

function parseJsonLines(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const objs = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    objs.push(JSON.parse(trimmed));
  }
  return objs;
}

function loadEvents(eventsDir) {
  const files = listFilesRecursive(eventsDir).filter((p) => p.endsWith(".json") || p.endsWith(".ndjson"));
  const events = [];
  for (const f of files) {
    const txt = fs.readFileSync(f, "utf8");
    const isNdjson = f.endsWith(".ndjson");
    if (isNdjson) {
      events.push(...parseJsonLines(txt));
    } else {
      // file may contain a single event or an array of events
      const obj = JSON.parse(txt);
      if (Array.isArray(obj)) events.push(...obj);
      else events.push(obj);
    }
  }
  // Normalize by retaining only expected OpenLineage-ish fields, but remain tolerant
  // and deterministic.
  const normalized = events.map((e) => ({
    eventType: e.eventType || e.event_type || null,
    eventTime: e.eventTime || e.event_time || null,
    producer: e.producer || null,
    run: e.run || null,
    job: e.job || null,
    inputs: e.inputs || e.inputDatasets || [],
    outputs: e.outputs || e.outputDatasets || [],
  }));

  // Sort deterministically by stable key derived from job+run+time+type
  normalized.sort((a, b) => {
    const ka = [
      a.job?.namespace || "",
      a.job?.name || "",
      a.run?.runId || a.run?.id || "",
      a.eventTime || "",
      a.eventType || "",
    ].join("|");
    const kb = [
      b.job?.namespace || "",
      b.job?.name || "",
      b.run?.runId || b.run?.id || "",
      b.eventTime || "",
      b.eventType || "",
    ].join("|");
    return stableCompare(ka, kb);
  });

  return normalized;
}

function loadPolicy(policyPath) {
  const txt = readTextIfExists(policyPath);
  if (!txt) {
    return {
      thresholds: {
        lineage_coverage_pct_min: 95,
        provenance_completeness_pct_min: 95,
      },
      severity_rules: {
        missing_job_emission: "P0",
        missing_dataset_edges: "P1",
        missing_agents: "P1",
      },
    };
  }
  return JSON.parse(txt);
}

function datasetKey(d) {
  // OpenLineage dataset uses {namespace, name}; tolerate variations.
  const ns = d?.namespace || d?.dataset?.namespace || d?.name?.namespace || "";
  const name = d?.name || d?.dataset?.name || d?.name?.name || "";
  return `${ns}:${name}`;
}

function jobKey(e) {
  return `${e.job?.namespace || ""}:${e.job?.name || ""}`;
}

function computeMetrics(events) {
  const jobs = new Map(); // jobKey -> {events, runs, inputs, outputs}
  const datasetEdges = new Set(); // "in->out" edges across a run
  const datasetsSeen = new Set();

  for (const e of events) {
    const jk = jobKey(e);
    if (!jobs.has(jk)) jobs.set(jk, { eventCount: 0, runIds: new Set(), inputs: new Set(), outputs: new Set() });
    const j = jobs.get(jk);
    j.eventCount++;
    if (e.run?.runId) j.runIds.add(e.run.runId);
    if (e.run?.id) j.runIds.add(e.run.id);

    const ins = Array.isArray(e.inputs) ? e.inputs : [];
    const outs = Array.isArray(e.outputs) ? e.outputs : [];

    for (const d of ins) {
      const dk = datasetKey(d);
      if (dk !== ":") {
        j.inputs.add(dk);
        datasetsSeen.add(dk);
      }
    }
    for (const d of outs) {
      const dk = datasetKey(d);
      if (dk !== ":") {
        j.outputs.add(dk);
        datasetsSeen.add(dk);
      }
    }

    // naive edge building: connect every input to every output per event
    for (const i of ins) {
      for (const o of outs) {
        const ik = datasetKey(i);
        const ok = datasetKey(o);
        if (ik !== ":" && ok !== ":" && ik !== ok) datasetEdges.add(`${ik} -> ${ok}`);
      }
    }
  }

  // Deterministic job summaries
  const jobSummaries = Array.from(jobs.entries())
    .sort((a, b) => stableCompare(a[0], b[0]))
    .map(([jk, j]) => ({
      job: jk,
      eventCount: j.eventCount,
      runCount: j.runIds.size,
      inputs: Array.from(j.inputs).sort(stableCompare),
      outputs: Array.from(j.outputs).sort(stableCompare),
    }));

  return {
    jobs_total: jobSummaries.length,
    jobs_emitting: jobSummaries.filter((j) => j.eventCount > 0).length,
    runs_total: jobSummaries.reduce((acc, j) => acc + j.runCount, 0),
    datasets_total: datasetsSeen.size,
    edges_total: datasetEdges.size,
    job_summaries: jobSummaries,
    edge_sample: Array.from(datasetEdges).sort(stableCompare).slice(0, 50),
  };
}

function computeGaps(metrics, policy) {
  const gaps = [];

  // Basic emission gap: no jobs, or jobs exist but 0 events (unlikely with our model)
  if (metrics.jobs_total === 0) {
    gaps.push({
      severity: policy.severity_rules?.missing_job_emission || "P0",
      kind: "missing_job_emission",
      target: "all",
      details: `No OpenLineage events were found.`,
      recommended_fix: `Populate ${EVENTS_DIR} with OpenLineage event JSON (from emitters, Marquez export, log sink, etc.).`,
    });
  }

  if (metrics.edges_total === 0 && metrics.jobs_total > 0) {
    gaps.push({
      severity: policy.severity_rules?.missing_dataset_edges || "P1",
      kind: "missing_dataset_edges",
      target: "all",
      details: `Jobs emitted events, but no dataset edges were inferred (inputs/outputs missing).`,
      recommended_fix: `Ensure events contain inputs[] and outputs[] datasets. For SQL/ETL, emit dataset facets for in/out tables.`,
    });
  }

  // Coverage heuristic: edges per dataset (very rough)
  let lineageCoveragePct = 0;
  if (metrics.datasets_total > 0) {
    // Assume "covered" if it participates in at least one edge (in or out). Approx using edges_total vs datasets_total
    lineageCoveragePct = Math.min(100, Math.round((metrics.edges_total / metrics.datasets_total) * 100));
  }
  if (lineageCoveragePct < (policy.thresholds?.lineage_coverage_pct_min ?? 95)) {
    gaps.push({
      severity: "P1",
      kind: "lineage_coverage_below_threshold",
      target: "coverage",
      details: `Estimated lineage coverage ${lineageCoveragePct}% is below minimum ${(policy.thresholds?.lineage_coverage_pct_min ?? 95)}%.`,
      recommended_fix: `Increase dataset-level capture and/or enrich SQL parsing to infer more in/out relationships.`,
    });
  }

  return { gaps: gaps.sort((a, b) => stableCompare(`${a.severity}|${a.kind}|${a.target || ""}`, `${b.severity}|${b.kind}|${b.target || ""}`)), lineageCoveragePct };
}

function renderReport(metrics, gapsObj, policy) {
  const nowNote = `Deterministic report. No wall-clock timestamps are embedded.`;
  const risk = gapsObj.gaps.some((g) => g.severity === "P0") ? "HIGH" : gapsObj.gaps.some((g) => g.severity === "P1") ? "MEDIUM" : "LOW";
  const gate = risk === "HIGH" ? "FAIL" : risk === "MEDIUM" ? "WARN" : "PASS";

  const lines = [];
  lines.push(`# Summit — Data Lineage & Provenance Report`);
  lines.push(``);
  lines.push(`- Commit: \`${SHA}\``);
  lines.push(`- Run Type: Scheduled (Nightly)`);
  lines.push(`- Status: ${gate}`);
  lines.push(`- Audit Risk: ${risk}`);
  lines.push(`- Note: ${nowNote}`);
  lines.push(``);
  lines.push(`## Executive Snapshot`);
  lines.push(`- Jobs emitting events: ${metrics.jobs_emitting} / ${metrics.jobs_total}`);
  lines.push(`- Runs observed: ${metrics.runs_total}`);
  lines.push(`- Datasets observed: ${metrics.datasets_total}`);
  lines.push(`- Dataset edges: ${metrics.edges_total}`);
  lines.push(`- Estimated lineage coverage: ${gapsObj.lineageCoveragePct}% (min ${(policy.thresholds?.lineage_coverage_pct_min ?? 95)}%)`);
  lines.push(``);
  lines.push(`## Gaps`);
  if (gapsObj.gaps.length === 0) {
    lines.push(`No gaps detected.`);
  } else {
    for (const g of gapsObj.gaps) {
      lines.push(`- [${g.severity}] ${g.kind}${g.target ? ` — ${g.target}` : ""}`);
      lines.push(`  - Details: ${g.details}`);
      lines.push(`  - Recommended fix: ${g.recommended_fix}`);
    }
  }
  lines.push(``);
  lines.push(`## Job Summaries`);
  for (const j of metrics.job_summaries) {
    lines.push(`- ${j.job}`);
    lines.push(`  - eventCount: ${j.eventCount}`);
    lines.push(`  - runCount: ${j.runCount}`);
    lines.push(`  - inputs: ${j.inputs.length ? j.inputs.join(", ") : "(none)"}`);
    lines.push(`  - outputs: ${j.outputs.length ? j.outputs.join(", ") : "(none)"}`);
  }
  lines.push(``);
  lines.push(`## Edge Sample (first 50)`);
  if (metrics.edge_sample.length === 0) lines.push(`(none)`);
  else for (const e of metrics.edge_sample) lines.push(`- ${e}`);
  lines.push(``);

  return lines.join("\n");
}

function main() {
  ensureDir(OUT_DIR);

  const policy = loadPolicy(POLICY_PATH);
  const events = loadEvents(EVENTS_DIR);
  const metrics = computeMetrics(events);
  const gapsObj = computeGaps(metrics, policy);

  const metricsOut = {
    schema_version: "lineage-metrics.v1",
    commit: SHA,
    inputs: {
      events_dir: EVENTS_DIR,
      policy_path: fs.existsSync(POLICY_PATH) ? POLICY_PATH : null,
      events_file_count: listFilesRecursive(EVENTS_DIR).filter((p) => p.endsWith(".json") || p.endsWith(".ndjson")).length,
      events_record_count: events.length,
    },
    metrics: {
      jobs_total: metrics.jobs_total,
      jobs_emitting: metrics.jobs_emitting,
      runs_total: metrics.runs_total,
      datasets_total: metrics.datasets_total,
      edges_total: metrics.edges_total,
      lineage_coverage_pct_est: gapsObj.lineageCoveragePct,
    },
    integrity: {
      deterministic_hash: null, // filled after stable stringify
    },
  };

  const reportMd = renderReport(metrics, gapsObj, policy);

  // Write in deterministic order
  const metricsJson = stableStringify(metricsOut);
  const reportHash = sha256(reportMd);
  const metricsHash = sha256(metricsJson);

  metricsOut.integrity.deterministic_hash = sha256(metricsHash + ":" + reportHash);

  const finalMetricsJson = stableStringify(metricsOut);

  fs.writeFileSync(path.join(OUT_DIR, "metrics.json"), finalMetricsJson, "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "gaps.json"), stableStringify(gapsObj.gaps), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "report.md"), reportMd, "utf8");

  console.log(`Wrote: ${OUT_DIR}/report.md`);
  console.log(`Wrote: ${OUT_DIR}/metrics.json`);
  console.log(`Wrote: ${OUT_DIR}/gaps.json`);
}

main();
