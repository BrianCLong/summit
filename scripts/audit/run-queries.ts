import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import yaml from 'js-yaml';

const ROOT = path.resolve(__dirname, '..', '..');
const EVIDENCE_REGISTRY = path.join(ROOT, 'audit', 'evidence-registry.yaml');
const EXCEPTIONS = path.join(ROOT, 'audit', 'exceptions.yaml');

function loadYaml<T>(file: string): T {
  return yaml.load(fs.readFileSync(file, 'utf-8')) as T;
}

function queryProductionChanges() {
  try {
    const log = execSync(
      'git log --since="30 days ago" --pretty=format:%h|%ad|%an|%s --date=iso -- services server infrastructure',
      { cwd: ROOT }
    )
      .toString()
      .trim();
    return log.split('\n').filter(Boolean);
  } catch (error) {
    return ['git history unavailable'];
  }
}

function queryUnauthorizedAgentChanges() {
  const provenancePath = path.join(ROOT, 'audit', 'ga-evidence');
  const hasLedger = fs.existsSync(provenancePath);
  return {
    ledgerPresent: hasLedger,
    message: hasLedger
      ? 'Provenance ledger available; correlate agent entries with CODEOWNERS approvals.'
      : 'Provenance ledger not present in workspace snapshot.',
  };
}

function queryDebtTrend() {
  const trendPath = path.join(ROOT, 'audit', 'ga-evidence', 'debt-trends');
  const exists = fs.existsSync(trendPath);
  return {
    location: path.relative(ROOT, trendPath),
    exists,
    note: exists ? 'Weekly debt trend reports available for monotonicity checks.' : 'No debt trend artifacts found.',
  };
}

function queryModelOutputProvenance() {
  const ledger = path.join(ROOT, 'audit', 'ga-evidence');
  return {
    ledger: path.relative(ROOT, ledger),
    available: fs.existsSync(ledger),
    note: 'Use ledger entries to link model version, dataset fingerprint, and policy decisions to outputs.',
  };
}

function queryExceptions() {
  const exceptions = loadYaml<{ exceptions: { id: string; expires_at: string; scope: string }[] }>(EXCEPTIONS).exceptions;
  const now = new Date();
  return exceptions.map((entry) => ({
    id: entry.id,
    scope: entry.scope,
    expires_at: entry.expires_at,
    expired: new Date(entry.expires_at) < now,
  }));
}

function querySbom() {
  const sbomPath = path.join(ROOT, 'sbom-mc-v0.4.5.json');
  const exists = fs.existsSync(sbomPath);
  return {
    exists,
    location: path.relative(ROOT, sbomPath),
    attestation: exists ? 'Hash and attestation can be produced from artifact.' : 'SBOM artifact missing in snapshot.',
  };
}

function main() {
  const evidence = loadYaml<{ evidence: any[] }>(EVIDENCE_REGISTRY).evidence;
  const responses = {
    production_changes_last_30_days: queryProductionChanges(),
    unauthorized_agent_modifications: queryUnauthorizedAgentChanges(),
    technical_debt_trajectory: queryDebtTrend(),
    model_output_provenance: queryModelOutputProvenance(),
    open_exceptions: queryExceptions(),
    sbom_supply_chain: querySbom(),
    evidence_registry_entries: evidence,
  };

  console.log(JSON.stringify(responses, null, 2));
}

if (require.main === module) {
  main();
}
