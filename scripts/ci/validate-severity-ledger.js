"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const js_yaml_1 = __importDefault(require("js-yaml"));
const SEVERITY_ORDER = {
    P0: 3,
    P1: 2,
    P2: 1,
};
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i += 1) {
        const [rawKey, rawValue] = args[i].split('=');
        const key = rawKey.replace(/^--/, '');
        if (rawValue === undefined) {
            const next = args[i + 1];
            if (next) {
                options[key] = next;
                i += 1;
            }
        }
        else {
            options[key] = rawValue;
        }
    }
    return {
        ledgerPath: options.ledger ?? 'governance/severity-ledger.yaml',
        baseRef: options.base ?? process.env.GITHUB_BASE_REF ?? 'origin/main',
        reportPath: options.report ?? 'artifacts/severity-ledger-report.json',
    };
}
function readLedgerContent(source) {
    const parsed = js_yaml_1.default.load(source);
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Ledger content is empty or not an object');
    }
    const ledger = parsed;
    if (!Array.isArray(ledger.issues)) {
        throw new Error('Ledger must contain an issues array');
    }
    return ledger;
}
function loadLedgerFromFile(filePath) {
    const absolute = node_path_1.default.resolve(process.cwd(), filePath);
    const content = node_fs_1.default.readFileSync(absolute, 'utf8');
    return readLedgerContent(content);
}
function loadLedgerFromGit(ref, ledgerPath) {
    const target = `${ref}:${ledgerPath}`;
    try {
        const content = (0, node_child_process_1.execSync)(`git show ${target}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        return readLedgerContent(content);
    }
    catch (error) {
        return null;
    }
}
function ensureReportDir(reportPath) {
    const reportDir = node_path_1.default.dirname(reportPath);
    if (!node_fs_1.default.existsSync(reportDir)) {
        node_fs_1.default.mkdirSync(reportDir, { recursive: true });
    }
}
function validateIssue(issue) {
    const failures = [];
    const requiredStringFields = [
        'id',
        'title',
        'severity',
        'status',
        'rationale',
        'owner_agent',
        'introduced_in',
    ];
    requiredStringFields.forEach((field) => {
        const value = issue[field];
        if (typeof value !== 'string' || value.trim().length === 0) {
            failures.push(`Field ${field} must be a non-empty string for issue ${issue.id ?? '<unknown>'}`);
        }
    });
    if (!['P0', 'P1', 'P2'].includes(issue.severity)) {
        failures.push(`Invalid severity ${issue.severity} for issue ${issue.id}`);
    }
    if (!['open', 'closed'].includes(issue.status)) {
        failures.push(`Invalid status ${issue.status} for issue ${issue.id}`);
    }
    if (issue.status === 'closed' && (!issue.resolved_in || issue.resolved_in.trim().length === 0)) {
        failures.push(`Closed issue ${issue.id} must include resolved_in`);
    }
    if (issue.evidence && issue.evidence.some((entry) => typeof entry !== 'string' || entry.trim().length === 0)) {
        failures.push(`Evidence entries must be non-empty strings for issue ${issue.id}`);
    }
    return failures;
}
function buildIssueMap(ledger) {
    const map = new Map();
    ledger.issues.forEach((issue) => {
        if (map.has(issue.id)) {
            throw new Error(`Duplicate issue id detected: ${issue.id}`);
        }
        map.set(issue.id, issue);
    });
    return map;
}
function detectOpenIssues(ledger) {
    const openIssues = ledger.issues.filter((issue) => issue.status !== 'closed');
    if (openIssues.length === 0)
        return [];
    return openIssues.map((issue) => `Open ${issue.severity} issue detected: ${issue.id} (${issue.title})`);
}
function detectSeverityDrift(current, base) {
    if (!base)
        return [];
    const baseMap = buildIssueMap(base);
    const failures = [];
    current.issues.forEach((issue) => {
        const previous = baseMap.get(issue.id);
        if (!previous)
            return;
        const previousRank = SEVERITY_ORDER[previous.severity];
        const currentRank = SEVERITY_ORDER[issue.severity];
        if (currentRank < previousRank) {
            failures.push(`Severity downgrade detected for ${issue.id}: ${previous.severity} -> ${issue.severity}. Add explicit rationale and governance approval.`);
        }
    });
    baseMap.forEach((issue, id) => {
        const present = current.issues.find((candidate) => candidate.id === id);
        if (!present) {
            failures.push(`Issue ${id} removed from ledger without closure record (status: ${issue.status}).`);
        }
    });
    return failures;
}
function detectNewIssuesWithoutBaseline(current, base) {
    if (!base)
        return [];
    const baseIds = new Set(base.issues.map((issue) => issue.id));
    const failures = [];
    current.issues.forEach((issue) => {
        if (!baseIds.has(issue.id) && issue.status !== 'closed') {
            failures.push(`New issue ${issue.id} added as ${issue.severity} but is not closed; zero-tolerance gate blocks merge.`);
        }
    });
    return failures;
}
function writeReport(reportPath, payload) {
    ensureReportDir(reportPath);
    node_fs_1.default.writeFileSync(reportPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
function main() {
    const { ledgerPath, baseRef, reportPath } = parseArgs();
    const failures = [];
    const advisories = [];
    const ledger = loadLedgerFromFile(ledgerPath);
    const baseline = loadLedgerFromGit(baseRef, ledgerPath);
    ledger.issues.forEach((issue) => failures.push(...validateIssue(issue)));
    failures.push(...detectOpenIssues(ledger));
    failures.push(...detectSeverityDrift(ledger, baseline));
    failures.push(...detectNewIssuesWithoutBaseline(ledger, baseline));
    if (!baseline) {
        advisories.push(`No baseline ledger found at ${baseRef}. Skipping drift comparisons.`);
    }
    const report = {
        ledgerPath,
        baseRef,
        status: failures.length === 0 ? 'pass' : 'fail',
        failures,
        advisories,
        totalIssues: ledger.issues.length,
        openIssues: ledger.issues.filter((issue) => issue.status !== 'closed').length,
        timestamp: new Date().toISOString(),
    };
    writeReport(reportPath, report);
    if (advisories.length > 0) {
        advisories.forEach((advisory) => console.log(`[severity-ledger][advisory] ${advisory}`));
    }
    if (failures.length > 0) {
        failures.forEach((failure) => console.error(`[severity-ledger][failure] ${failure}`));
        console.error(`[severity-ledger] Hard failure. Report written to ${reportPath}`);
        process.exitCode = 1;
        return;
    }
    console.log(`[severity-ledger] Ledger validated successfully with ${ledger.issues.length} issues.`);
    console.log(`[severity-ledger] Report written to ${reportPath}`);
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
