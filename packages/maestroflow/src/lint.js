"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flowLint = flowLint;
function flowLint(flow) {
    const out = [];
    if (!flow.nodes.some((n) => n.type === 'test'))
        out.push({
            id: 'no-tests',
            level: 'error',
            msg: 'Flow missing tests step',
        });
    const deployNeedsGate = flow.nodes.some((n) => n.type === 'deploy') &&
        !flow.nodes.some((n) => n.type === 'approve');
    if (deployNeedsGate)
        out.push({
            id: 'no-gate',
            level: 'warn',
            msg: 'Deploy without confidence/approval gate',
        });
    return out;
}
