"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
test('score passes when rules satisfied', () => {
    let out;
    try {
        out = (0, child_process_1.execFileSync)('node', [
            'tools/blueprints/score.ts',
            'packages/blueprints/node-service.yaml',
            'demo',
        ]).toString();
    }
    catch (e) {
        out = e.stdout.toString();
    }
    expect(out).toContain('{"score"}');
});
