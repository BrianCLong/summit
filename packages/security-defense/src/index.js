#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runner_js_1 = require("./runner.js");
const parseArgs = () => {
    const args = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (arg === '--root') {
            options.rootDir = args[i + 1];
            i += 1;
        }
        else if (arg === '--sbom-baseline') {
            options.sbomBaselinePath = args[i + 1];
            i += 1;
        }
        else if (arg === '--sbom-target') {
            options.sbomTargetPath = args[i + 1];
            i += 1;
        }
        else if (arg === '--rotation-days') {
            options.rotationThresholdDays = Number.parseInt(args[i + 1], 10);
            i += 1;
        }
    }
    return options;
};
const main = () => {
    const options = parseArgs();
    const results = (0, runner_js_1.runAllChecks)(options);
    const summary = (0, runner_js_1.summarizeResults)(results);
    console.log(JSON.stringify({ summary, results }, null, 2));
    if (summary.failures.length > 0) {
        process.exitCode = 1;
    }
};
main();
