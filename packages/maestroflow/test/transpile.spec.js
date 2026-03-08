"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const github_1 = require("../src/transpile/github");
test('edges become needs', () => {
    const flow = {
        name: 'x',
        triggers: ['pull_request'],
        nodes: [
            { id: 'a', type: 'build' },
            { id: 'b', type: 'test' },
        ],
        edges: [{ from: 'a', to: 'b' }],
    };
    const yml = (0, github_1.toGitHub)(flow);
    expect(yml.jobs.b.needs).toContain('a');
});
