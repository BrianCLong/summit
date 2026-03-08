"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const js_yaml_1 = __importDefault(require("js-yaml"));
const ROOT = path_1.default.resolve(__dirname, '..', '..');
const EVIDENCE_REGISTRY = path_1.default.join(ROOT, 'audit', 'evidence-registry.yaml');
const EXCEPTIONS = path_1.default.join(ROOT, 'audit', 'exceptions.yaml');
function loadYaml(file) {
    return js_yaml_1.default.load(fs_1.default.readFileSync(file, 'utf-8'));
}
function queryProductionChanges() {
    try {
        const log = (0, child_process_1.execSync)('git log --since="30 days ago" --pretty=format:%h|%ad|%an|%s --date=iso -- services server infrastructure', { cwd: ROOT })
            .toString()
            .trim();
        return log.split('\n').filter(Boolean);
    }
    catch (error) {
        return ['git history unavailable'];
    }
}
function queryUnauthorizedAgentChanges() {
    const provenancePath = path_1.default.join(ROOT, 'audit', 'ga-evidence');
    const hasLedger = fs_1.default.existsSync(provenancePath);
    return {
        ledgerPresent: hasLedger,
        message: hasLedger
            ? 'Provenance ledger available; correlate agent entries with CODEOWNERS approvals.'
            : 'Provenance ledger not present in workspace snapshot.',
    };
}
function queryDebtTrend() {
    const trendPath = path_1.default.join(ROOT, 'audit', 'ga-evidence', 'debt-trends');
    const exists = fs_1.default.existsSync(trendPath);
    return {
        location: path_1.default.relative(ROOT, trendPath),
        exists,
        note: exists ? 'Weekly debt trend reports available for monotonicity checks.' : 'No debt trend artifacts found.',
    };
}
function queryModelOutputProvenance() {
    const ledger = path_1.default.join(ROOT, 'audit', 'ga-evidence');
    return {
        ledger: path_1.default.relative(ROOT, ledger),
        available: fs_1.default.existsSync(ledger),
        note: 'Use ledger entries to link model version, dataset fingerprint, and policy decisions to outputs.',
    };
}
function queryExceptions() {
    const exceptions = loadYaml(EXCEPTIONS).exceptions;
    const now = new Date();
    return exceptions.map((entry) => ({
        id: entry.id,
        scope: entry.scope,
        expires_at: entry.expires_at,
        expired: new Date(entry.expires_at) < now,
    }));
}
function querySbom() {
    const sbomPath = path_1.default.join(ROOT, 'sbom-mc-v0.4.5.json');
    const exists = fs_1.default.existsSync(sbomPath);
    return {
        exists,
        location: path_1.default.relative(ROOT, sbomPath),
        attestation: exists ? 'Hash and attestation can be produced from artifact.' : 'SBOM artifact missing in snapshot.',
    };
}
function main() {
    const evidence = loadYaml(EVIDENCE_REGISTRY).evidence;
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
