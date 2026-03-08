"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const loadPolicy_1 = require("../../agentic/procedures/policy/loadPolicy");
const loader_1 = require("../../agentic/procedures/loader");
const validate_1 = require("../../agentic/procedures/validator/validate");
const compile_1 = require("../../agentic/procedures/compiler/compile");
const repoRoot = (0, node_path_1.resolve)(process.cwd());
const examplesDir = (0, node_path_1.resolve)(repoRoot, 'procedures', 'examples');
const policyPath = (0, node_path_1.resolve)(repoRoot, 'agentic', 'procedures', 'policy', 'default.policy.yaml');
async function lintProcedures() {
    const policy = await (0, loadPolicy_1.loadPolicyFromFile)(policyPath);
    const files = (await (0, promises_1.readdir)(examplesDir))
        .filter(file => file.endsWith('.yaml'))
        .sort((left, right) => left.localeCompare(right));
    const failures = [];
    for (const file of files) {
        const procedurePath = (0, node_path_1.resolve)(examplesDir, file);
        const procedure = await (0, loader_1.loadProcedureFromFile)(procedurePath);
        try {
            (0, validate_1.validateProcedure)(procedure, policy);
        }
        catch (error) {
            failures.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
            continue;
        }
        const plan = (0, compile_1.compileProcedure)(procedure);
        const serialized = (0, compile_1.serializePlan)(plan);
        const goldenPath = procedurePath.replace(/\.ya?ml$/, '.plan.json');
        const golden = await (0, promises_1.readFile)(goldenPath, 'utf8');
        if (serialized !== golden) {
            failures.push(`${file}: golden plan drift detected`);
        }
    }
    if (failures.length > 0) {
        console.error('Procedure lint failed:');
        failures.forEach(line => console.error(`- ${line}`));
        return 1;
    }
    console.log('Procedure lint passed.');
    return 0;
}
lintProcedures()
    .then(code => {
    process.exitCode = code;
})
    .catch(error => {
    console.error(error);
    process.exitCode = 1;
});
