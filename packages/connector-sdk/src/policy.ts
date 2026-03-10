import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { ConnectorManifest, PolicyVerdict } from "./types.js";

export interface PolicyEvaluation {
  verdict: PolicyVerdict;
  reasons: string[];
}

export function evaluatePolicy(manifest: ConnectorManifest): PolicyEvaluation {
  const reasons: string[] = [];

  for (const ref of manifest.policy_refs) {
    const fullPath = path.resolve(process.cwd(), ref);
    if (!fs.existsSync(fullPath)) {
      reasons.push(`missing_policy_ref:${ref}`);
    }
  }

  if (manifest.collection_mode === "scrape" && manifest.license_class === "restricted") {
    reasons.push("restricted_scrape_disallowed");
  }

  return {
    verdict: reasons.length ? "deny" : "allow",
    reasons
  };
}

export function loadYamlFile(filePath: string): unknown {
  return YAML.parse(fs.readFileSync(filePath, "utf8"));
}
