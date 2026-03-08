"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProofOfUsefulWorkbookCoordinator = void 0;
const promptOps_js_1 = require("../promptOps.js");
function parseWorkbook(content) {
    const commands = [];
    const lines = content.split(/\n/).map((line) => line.trim());
    let current = {};
    for (const line of lines) {
        if (line.startsWith('CMD:')) {
            if (current.command) {
                commands.push(current);
                current = {};
            }
            current.command = line.slice(4).trim();
        }
        else if (line.startsWith('DESC:')) {
            current.description = line.slice(5).trim();
        }
        else if (line.startsWith('EXPECT:')) {
            current.expectedOutcome = line.slice(7).trim();
        }
    }
    if (current.command) {
        commands.push(current);
    }
    return commands;
}
class ProofOfUsefulWorkbookCoordinator {
    guard = new promptOps_js_1.GuardedGenerator();
    async execute(task, resource) {
        const generated = await resource.generate({
            task,
            strand: 'implementation',
            prompt: `Produce an executable workbook (CMD/DESC/EXPECT) that validates ${task.title}.`,
        });
        const commands = parseWorkbook(generated.content);
        let receipt = null;
        if (resource.runWorkbook) {
            receipt = await resource.runWorkbook(commands);
        }
        const evidence = [
            ...(generated.evidence ?? []),
            ...(receipt ? receipt.artifacts : []),
        ];
        const { artifact } = this.guard.enforce('proof-of-useful-workbook', generated.content, [], evidence);
        return { artifact, receipt };
    }
}
exports.ProofOfUsefulWorkbookCoordinator = ProofOfUsefulWorkbookCoordinator;
