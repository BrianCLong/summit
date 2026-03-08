"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const node_child_process_1 = require("node:child_process");
const yaml_1 = require("yaml");
const loadPolicy_1 = require("../../agentic/procedures/policy/loadPolicy");
const loader_1 = require("../../agentic/procedures/loader");
const validate_1 = require("../../agentic/procedures/validator/validate");
const compile_1 = require("../../agentic/procedures/compiler/compile");
const repoRoot = (0, node_path_1.resolve)(process.cwd());
const policyPath = (0, node_path_1.resolve)(repoRoot, 'agentic', 'procedures', 'policy', 'default.policy.yaml');
const standardsPath = (0, node_path_1.resolve)(repoRoot, 'docs', 'standards', 'ctech-spring-active-software.md');
const examplesDir = (0, node_path_1.resolve)(repoRoot, 'procedures', 'examples');
const evidenceDir = (0, node_path_1.resolve)(repoRoot, 'evidence', 'agentic-procedures-drift');
const reportPath = (0, node_path_1.resolve)(evidenceDir, 'report.json');
function getGitSha() {
    try {
        return (0, node_child_process_1.execSync)('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    }
    catch {
        return 'unknown';
    }
}
function extractAllowlistDoc(contents) {
    const match = contents.match(/```yaml\n([\s\S]*?)\n```/);
    if (!match) {
        throw new Error('Allowlist registry block not found in standards doc.');
    }
    return (0, yaml_1.parse)(match[1]);
}
function diffList(policyList, docList) {
    return policyList.filter(item => !docList.includes(item));
}
async function runDriftCheck() {
    const policy = await (0, loadPolicy_1.loadPolicyFromFile)(policyPath);
    const standards = await (0, promises_1.readFile)(standardsPath, 'utf8');
    const docAllowlist = extractAllowlistDoc(standards).allowlist;
    const missingStepTypes = diffList(policy.allow.stepTypes, docAllowlist.stepTypes);
    const missingDomains = diffList(policy.allow.httpDomains, docAllowlist.httpDomains);
    const missingExports = diffList(policy.allow.exportDestinations.csv, docAllowlist.exportDestinations.csv);
    const files = (await (0, promises_1.readdir)(examplesDir))
        .filter(file => file.endsWith('.yaml'))
        .sort((left, right) => left.localeCompare(right));
    const validationFailures = [];
    const goldenDrift = [];
    for (const file of files) {
        const procedurePath = (0, node_path_1.resolve)(examplesDir, file);
        const procedure = await (0, loader_1.loadProcedureFromFile)(procedurePath);
        try {
            (0, validate_1.validateProcedure)(procedure, policy);
        }
        catch (error) {
            validationFailures.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
            continue;
        }
        const plan = (0, compile_1.compileProcedure)(procedure);
        const serialized = (0, compile_1.serializePlan)(plan);
        const goldenPath = procedurePath.replace(/\.ya?ml$/, '.plan.json');
        const golden = await (0, promises_1.readFile)(goldenPath, 'utf8');
        if (serialized !== golden) {
            goldenDrift.push(file);
        }
    }
    const report = {
        gitSha: getGitSha(),
        allowlistDrift: {
            stepTypes: missingStepTypes,
            httpDomains: missingDomains,
            exportDestinations: missingExports,
        },
        validationFailures,
        goldenDrift,
        status: missingStepTypes.length === 0 &&
            missingDomains.length === 0 &&
            missingExports.length === 0 &&
            validationFailures.length === 0 &&
            goldenDrift.length === 0
            ? 'clean'
            : 'drift-detected',
    };
    await (0, promises_1.mkdir)(evidenceDir, { recursive: true });
    await (0, promises_1.writeFile)(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    if (report.status !== 'clean') {
        console.error('Procedure drift detected.');
        console.error(JSON.stringify(report, null, 2));
        return 1;
    }
    console.log('No procedure drift detected.');
    return 0;
}
runDriftCheck()
    .then(code => {
    process.exitCode = code;
})
    .catch(error => {
    console.error(error);
    process.exitCode = 1;
});
