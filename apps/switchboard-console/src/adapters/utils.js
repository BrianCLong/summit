"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveArgs = exports.commandExists = void 0;
const node_child_process_1 = require("node:child_process");
const commandExists = (command) => {
    const result = (0, node_child_process_1.spawnSync)('which', [command], { stdio: 'ignore' });
    return result.status === 0;
};
exports.commandExists = commandExists;
const resolveArgs = (rawArgs, prompt) => {
    if (rawArgs) {
        try {
            const parsed = JSON.parse(rawArgs);
            return parsed.map((value) => value.replace('{prompt}', prompt));
        }
        catch {
            return rawArgs.split(' ').map((value) => value.replace('{prompt}', prompt));
        }
    }
    return ['--prompt', prompt];
};
exports.resolveArgs = resolveArgs;
