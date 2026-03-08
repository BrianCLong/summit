"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nlToFlow = nlToFlow;
function nlToFlow(text) {
    const t = text.toLowerCase();
    const nodes = [];
    const edges = [];
    const add = (id, type) => {
        if (!nodes.find((n) => n.id === id))
            nodes.push({ id, type });
    };
    if (/on (pr|pull request)/.test(t)) {
        /* trigger */
    }
    add('build', 'build');
    if (/test/.test(t))
        (add('test', 'test'), edges.push({ from: 'build', to: 'test' }));
    if (/tia|impact/.test(t))
        nodes.find((n) => n.id === 'test').mode = 'tia';
    if (/(deploy|rollout)/.test(t))
        (add('deploy', 'deploy'), edges.push({ from: 'test', to: 'deploy' }));
    if (/confidence\s*(>=|≥)\s*85/.test(t))
        (nodes.push({ id: 'gate', type: 'approve', cond: 'confidence>=85' }),
            edges.push({ from: 'test', to: 'gate' }, { from: 'gate', to: 'deploy' }));
    return { name: 'nl-flow', triggers: ['pull_request'], nodes, edges };
}
