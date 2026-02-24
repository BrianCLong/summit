#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

// Adjust path because we are inside summit/ repo structure but running from root likely
const BASE_DIR = "summit";

const [,, agent, tool, scopeAllJson, maxMs, maxCalls, sandbox] = process.argv;
const runId = process.env.RUN_ID || crypto.randomUUID();
const telemetryDir = path.join(BASE_DIR, "telemetry");
if (!fs.existsSync(telemetryDir)) fs.mkdirSync(telemetryDir, { recursive: true });
const telemetryPath = path.join(telemetryDir, `tool-${tool}-${runId}.json`);

const input = {
  tool: { name: tool, scope_all: JSON.parse(scopeAllJson) },
  runtime: { duration_ms: 0, calls: 0 }
};

// 1) OPA eval (bundle loads policies.yml as data.policies)
const tmpDir = ".tmp";
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
const policyInputPath = path.join(tmpDir, `policy-input-${runId}.json`);
fs.writeFileSync(policyInputPath, JSON.stringify(input));

const policyDir = path.join(BASE_DIR, "agents/tool_policies");
const opa = spawnSync("opa", ["eval","-f","json","-d",policyDir,"data.summit.tools.decision","-i",policyInputPath], { encoding: "utf8" });

if (opa.error) {
    console.error("OPA execution failed:", opa.error);
    process.exit(1);
}

let decision = "deny";
try {
    const result = JSON.parse(opa.stdout);
    if (result.result && result.result.length > 0 && result.result[0].expressions) {
        decision = result.result[0].expressions[0].value;
    }
} catch (e) {
    console.error("Failed to parse OPA output:", e);
}

if (decision !== "allow") {
  fs.writeFileSync(telemetryPath, JSON.stringify({ runId, agent, tool, start_ts: Date.now(), duration_ms:0,cpu_ms:0,mem_bytes:0,io_hash:"",decision,signature:"" }));
  console.error(`DENY by policy for tool ${tool}`); process.exit(2);
}

// 2) run in selected sandbox (only wasm shown here)
const start = Date.now();
const ioHash = crypto.createHash("sha256").update(`${agent}:${tool}:${runId}`).digest("hex");
const env = { ...process.env, RUN_ID: runId, AGENT: agent, TOOL: tool, IO_HASH: ioHash, DECISION: decision, TELEMETRY_PATH: telemetryPath };

// Binary path
let cmd = [path.join(BASE_DIR, "infra/wasm-runner/wasm-runner")];

const r = spawnSync(cmd[0], cmd.slice(1), { env, encoding: "utf8", timeout: Number(maxMs) });

const duration = Date.now() - start;
if (r.status !== 0) {
  // still emit telemetry
  fs.writeFileSync(telemetryPath, JSON.stringify({ runId, agent, tool, start_ts:start, duration_ms:duration, cpu_ms:0, mem_bytes:0, io_hash:ioHash, decision:"deny", signature:"" }));
  console.error(r.stderr || "runner failed"); process.exit(1);
}
