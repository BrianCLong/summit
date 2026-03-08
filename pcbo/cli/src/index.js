#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const HELP_TEXT = `pcbo <command> [options]\n\nCommands:\n  plan       Generate the deterministic partition plan\n  dry-run    Evaluate the dry-run diff with policy gates\n  execute    Run the backfill and emit proofs/reports\n\nOptions:\n  --host <host>     Orchestrator host (default: localhost)\n  --port <port>     Orchestrator port (default: 8080)\n  --input <file>    Path to JSON request payload (required)\n  --output <file>   Optional file to write the response\n  --help            Show this help message\n`;
function parseArgs(argv) {
    if (argv.length === 0) {
        return null;
    }
    const [command, ...rest] = argv;
    if (!['plan', 'dry-run', 'execute'].includes(command)) {
        return null;
    }
    const options = {};
    for (let i = 0; i < rest.length; i += 1) {
        const key = rest[i];
        if (!key.startsWith('--')) {
            throw new Error(`unexpected argument: ${key}`);
        }
        const value = rest[i + 1];
        if (value === undefined || value.startsWith('--')) {
            throw new Error(`missing value for ${key}`);
        }
        options[key.slice(2)] = value;
        i += 1;
    }
    if (!options.input) {
        throw new Error('missing required option --input');
    }
    const host = options.host ?? 'localhost';
    const port = options.port ? Number.parseInt(options.port, 10) : 8080;
    if (Number.isNaN(port)) {
        throw new Error('port must be a number');
    }
    return {
        command: command,
        host,
        port,
        input: (0, node_path_1.resolve)(options.input),
        output: options.output ? (0, node_path_1.resolve)(options.output) : undefined,
    };
}
async function main() {
    try {
        const parsed = parseArgs(process.argv.slice(2));
        if (!parsed) {
            process.stdout.write(HELP_TEXT);
            process.exit(0);
            return;
        }
        const payload = JSON.parse((0, node_fs_1.readFileSync)(parsed.input, 'utf8'));
        const endpoint = parsed.command === 'dry-run' ? 'dry-run' : parsed.command;
        const url = new URL(`/v1/${endpoint}`, `http://${parsed.host}:${parsed.port}`);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const text = await response.text();
        let parsedBody;
        try {
            parsedBody = text.length ? JSON.parse(text) : {};
        }
        catch (error) {
            throw new Error(`failed to parse orchestrator response: ${error.message}`);
        }
        const serialized = JSON.stringify(parsedBody, null, 2);
        if (parsed.output) {
            (0, node_fs_1.writeFileSync)(parsed.output, `${serialized}\n`);
        }
        else {
            process.stdout.write(`${serialized}\n`);
        }
        if (!response.ok) {
            const violations = parsedBody.report?.policyViolations;
            if (Array.isArray(violations) && violations.length > 0) {
                process.stderr.write('policy violations detected:\n');
                process.stderr.write(`${JSON.stringify(violations, null, 2)}\n`);
            }
            process.exit(2);
        }
    }
    catch (error) {
        process.stderr.write(`${error.message}\n`);
        process.stderr.write(HELP_TEXT);
        process.exit(1);
    }
}
void main();
