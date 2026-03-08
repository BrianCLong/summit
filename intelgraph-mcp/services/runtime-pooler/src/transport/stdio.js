"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.launch = launch;
const child_process_1 = require("child_process");
const events_1 = require("events");
async function launch(command, args = [], env = {}) {
    const disableSandbox = process.env.NSJAIL_DISABLE === '1';
    const child = disableSandbox
        ? (0, child_process_1.spawn)(command, args, {
            stdio: ['pipe', 'pipe', 'inherit'],
            env: { ...process.env, ...env },
        })
        : (0, child_process_1.spawn)(process.env.NSJAIL_BIN ?? 'nsjail', [
            '-q',
            '--config',
            process.env.NSJAIL_CONFIG ?? '/etc/nsjail/mcp-stdio.cfg',
            '--',
            command,
            ...args,
        ], {
            stdio: ['pipe', 'pipe', 'inherit'],
            env: { ...process.env, ...env },
        });
    if (!child.stdin || !child.stdout) {
        child.kill();
        throw new Error('failed to spawn stdio server');
    }
    await (0, events_1.once)(child, 'spawn');
    const write = (payload) => {
        child.stdin.write(JSON.stringify(payload));
        child.stdin.write('\n');
    };
    async function* readStream() {
        let buffer = '';
        for await (const chunk of child.stdout) {
            buffer += chunk.toString('utf8');
            let index = buffer.indexOf('\n');
            while (index >= 0) {
                const line = buffer.slice(0, index);
                buffer = buffer.slice(index + 1);
                if (line.trim().length > 0) {
                    yield JSON.parse(line);
                }
                index = buffer.indexOf('\n');
            }
        }
    }
    return {
        pid: child.pid ?? -1,
        write,
        stream: readStream(),
    };
}
