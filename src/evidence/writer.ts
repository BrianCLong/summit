import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalStringify, sha256Hex } from './evid';

export type StepStatus = 'ok' | 'skipped' | 'blocked' | 'error';

export type EvidenceBundle = {
  evid: string;
  inputs: Record<string, unknown>;
  policy: Record<string, unknown>;
  steps: Array<{ step_id: string; type: string; mode: string; status: StepStatus; artifacts: string[]; reason?: string }>;
  findings: Array<Record<string, unknown>>;
  hashes: { input_manifest_sha256: string; bundle_sha256: string };
};

export function redactSensitive<T extends Record<string, unknown>>(input: T): T {
  const redactKeys = new Set(['raw_media_bytes', 'faces', 'phone_numbers', 'emails']);
  return Object.keys(input).reduce((acc, key) => {
    if (!redactKeys.has(key)) {
      acc[key as keyof T] = input[key] as T[keyof T];
    }
    return acc;
  }, {} as T);
}

export function writeEvidenceFiles(baseOutDir: string, bundleWithoutHash: Omit<EvidenceBundle, 'hashes'>, inputManifestSha256: string): EvidenceBundle {
  const cleanFindings = bundleWithoutHash.findings.map((f) => redactSensitive(f));
  const stableBundle = { ...bundleWithoutHash, findings: cleanFindings };
  const bundleSha = sha256Hex(canonicalStringify(stableBundle));
  const bundle: EvidenceBundle = {
    ...stableBundle,
    hashes: {
      input_manifest_sha256: inputManifestSha256,
      bundle_sha256: bundleSha,
    },
  };

  const outDir = join(baseOutDir, bundle.evid);
  mkdirSync(outDir, { recursive: true });

  const report = {
    evid: bundle.evid,
    steps: bundle.steps,
    findings: bundle.findings,
  };

  const provenance = {
    evid: bundle.evid,
    policy: bundle.policy,
    hashes: bundle.hashes,
    fixtures: bundle.inputs,
  };

  const metrics = {
    step_count: bundle.steps.length,
    blocked_steps: bundle.steps.filter((s) => s.status === 'blocked').length,
    finding_count: bundle.findings.length,
  };

  const stamp = {
    evid: bundle.evid,
    bundle_sha256: bundle.hashes.bundle_sha256,
    policy_network: bundle.policy.network,
    connectors_allowlist: (bundle.policy.connectors as { allowlist?: string[] } | undefined)?.allowlist ?? [],
  };

  writeFileSync(join(outDir, 'report.json'), `${canonicalStringify(report)}\n`, 'utf8');
  writeFileSync(join(outDir, 'provenance.json'), `${canonicalStringify(provenance)}\n`, 'utf8');
  writeFileSync(join(outDir, 'metrics.json'), `${canonicalStringify(metrics)}\n`, 'utf8');
  writeFileSync(join(outDir, 'stamp.json'), `${canonicalStringify(stamp)}\n`, 'utf8');

  return bundle;
}
