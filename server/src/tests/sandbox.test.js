"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sandbox_js_1 = require("../nl2cypher/sandbox.js");
const node_child_process_1 = require("node:child_process");
const globals_1 = require("@jest/globals");
const dockerAvailable = (() => {
    try {
        (0, node_child_process_1.execSync)('docker info', { stdio: 'ignore' });
        return true;
    }
    catch {
        return false;
    }
})();
(0, globals_1.describe)('sandbox execution', () => {
    (0, globals_1.it)('blocks mutating queries', async () => {
        await (0, globals_1.expect)((0, sandbox_js_1.executeSandbox)('CREATE (n:Test)')).rejects.toThrow('Mutations are not allowed');
    });
    (dockerAvailable ? globals_1.it : globals_1.it.skip)('runs read-only queries', async () => {
        const rows = await (0, sandbox_js_1.executeSandbox)('RETURN 1 AS n');
        (0, globals_1.expect)(rows[0].n).toBe(1);
    });
});
