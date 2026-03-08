#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const replay_js_1 = require("../evidence/replay.js");
function parseArgs(argv) {
    const args = argv.slice(2);
    let bundle;
    let strict = false;
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (arg === '--bundle') {
            bundle = args[i + 1];
            i += 1;
        }
        else if (arg === '--strict') {
            strict = true;
        }
    }
    return { bundle, strict };
}
async function main() {
    const { bundle, strict } = parseArgs(process.argv);
    if (!bundle) {
        console.error('Usage: orchestrator-replay --bundle <path> [--strict]');
        process.exit(1);
    }
    const report = await (0, replay_js_1.replayEvidenceBundle)({ bundlePath: bundle, strict });
    if (!report.ok) {
        console.error('Replay mismatch detected');
        if (report.diff) {
            console.error(report.diff);
        }
        process.exit(1);
    }
    console.log('Replay successful');
}
main().catch((error) => {
    console.error('Replay failed', error);
    process.exit(1);
});
