"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const loader_1 = require("../../agentic/procedures/loader");
const compile_1 = require("../../agentic/procedures/compiler/compile");
const repoRoot = (0, node_path_1.resolve)(process.cwd());
const examplesDir = (0, node_path_1.resolve)(repoRoot, 'procedures', 'examples');
async function compileAll() {
    const files = (await (0, promises_1.readdir)(examplesDir))
        .filter(file => file.endsWith('.yaml'))
        .sort((left, right) => left.localeCompare(right));
    for (const file of files) {
        const procedurePath = (0, node_path_1.resolve)(examplesDir, file);
        const procedure = await (0, loader_1.loadProcedureFromFile)(procedurePath);
        const plan = (0, compile_1.compileProcedure)(procedure);
        const serialized = (0, compile_1.serializePlan)(plan);
        const goldenPath = procedurePath.replace(/\.ya?ml$/, '.plan.json');
        await (0, promises_1.writeFile)(goldenPath, serialized, 'utf8');
    }
    console.log(`Compiled ${files.length} procedures.`);
}
compileAll().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
