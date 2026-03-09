import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import type { BundleEnv, PolicyBundle, PolicySignature } from "./types";
import { sha256, stableStringify } from "../../../../packages/dpec/src/hash";
import {
  buildSkillRegistrySnapshot,
  writeSkillRegistrySnapshot,
} from "../../skills/registry.snapshot";

export interface BuildBundleOptions {
  createdAt?: string;
  approvals?: string[];
  signatures?: PolicySignature[];
  policyPath?: string;
  skillsSnapshotPath?: string;
  outputPath?: string;
}

export function canonicalPolicySha256(policyYamlText: string): string {
  const parsed = yaml.load(policyYamlText);
  return sha256(stableStringify(parsed));
}

function loadSkillsSnapshot(skillsPath: string, env: BundleEnv): unknown {
  if (fs.existsSync(skillsPath)) {
    return JSON.parse(fs.readFileSync(skillsPath, "utf8"));
  }

  if (env === "prod") {
    throw new Error(`Missing skills snapshot at ${skillsPath}`);
  }

  return writeSkillRegistrySnapshot({}, skillsPath);
}

export function buildBundle(env: BundleEnv, options: BuildBundleOptions = {}): PolicyBundle {
  const policyPath = options.policyPath ?? "summit/agents/policy/policy.yml";
  const skillsPath = options.skillsSnapshotPath ?? "summit/agents/skills/registry.snapshot.json";
  const outputPath = options.outputPath ?? `summit/agents/policy/policy-bundle.${env}.json`;

  const policyText = fs.readFileSync(policyPath, "utf8");
  const policySha = canonicalPolicySha256(policyText);

  const skillsSnapshot = buildSkillRegistrySnapshot(loadSkillsSnapshot(skillsPath, env));
  const skillsSha = sha256(stableStringify(skillsSnapshot));

  if (!fs.existsSync(skillsPath)) {
    fs.mkdirSync(path.dirname(skillsPath), { recursive: true });
    fs.writeFileSync(skillsPath, `${stableStringify(skillsSnapshot)}\n`, "utf8");
  }

  const bundle: PolicyBundle = {
    bundle_version: 1,
    policy_version: 1,
    created_at: options.createdAt ?? new Date().toISOString(),
    env,
    policy_sha256: policySha,
    skills_sha256: skillsSha,
    policy_path: policyPath,
    skills_path: skillsPath,
    approvals: options.approvals ?? [],
    signatures: options.signatures ?? [],
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${stableStringify(bundle)}\n`, "utf8");

  return bundle;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const env = (process.argv[2] ?? "dev") as BundleEnv;
  buildBundle(env);
}
