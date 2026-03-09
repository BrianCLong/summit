import fs from "node:fs";

import yaml from "js-yaml";

import type { BundleEnv } from "./types";
import { verifyBundle } from "./verify-bundle";

export interface AgentEvent {
  type: "POLICY_BUNDLE_VERIFIED";
  ts: string;
  allow: boolean;
  reason: string;
  run_id?: string;
  metadata?: Record<string, unknown>;
}

function emitPolicyBundleEvent(event: AgentEvent): void {
  const line = `${JSON.stringify(event)}\n`;
  fs.appendFileSync("summit/agents/policy/policy-events.jsonl", line, "utf8");
}

export function loadRuntimePolicy(env: BundleEnv, runId?: string): Record<string, unknown> {
  if (env === "prod") {
    const result = verifyBundle("prod");
    if (!result.ok) {
      emitPolicyBundleEvent({
        type: "POLICY_BUNDLE_VERIFIED",
        ts: new Date().toISOString(),
        allow: false,
        reason: result.errors.join("; "),
        run_id: runId,
        metadata: { env },
      });
      throw new Error(`prod bundle verification failed: ${result.errors.join("; ")}`);
    }

    emitPolicyBundleEvent({
      type: "POLICY_BUNDLE_VERIFIED",
      ts: new Date().toISOString(),
      allow: true,
      reason: "bundle verified",
      run_id: runId,
      metadata: { env },
    });
  }

  const raw = fs.readFileSync("summit/agents/policy/policy.yml", "utf8");
  const policy = yaml.load(raw);
  if (!policy || typeof policy !== "object") {
    throw new Error("policy.yml must be a YAML object");
  }
  return policy as Record<string, unknown>;
}
