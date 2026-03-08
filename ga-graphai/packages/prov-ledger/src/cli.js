#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const commander_1 = require("commander");
const manifest_js_1 = require("./manifest.js");
const program = new commander_1.Command();
program
    .name('prov-ledger-cli')
    .description('Validate provenance export manifests against ledger entries and evidence bundles')
    .requiredOption('-m, --manifest <path>', 'Path to manifest JSON file')
    .requiredOption('-l, --ledger <path>', 'Path to ledger entries JSON file')
    .option('-e, --evidence <path>', 'Path to evidence bundle JSON file')
    .action((opts) => {
    const manifest = JSON.parse((0, node_fs_1.readFileSync)(opts.manifest, 'utf-8'));
    const ledger = JSON.parse((0, node_fs_1.readFileSync)(opts.ledger, 'utf-8'));
    const evidence = opts.evidence
        ? JSON.parse((0, node_fs_1.readFileSync)(opts.evidence, 'utf-8'))
        : undefined;
    const result = (0, manifest_js_1.verifyManifest)(manifest, ledger, { evidence });
    if (!result.valid) {
        console.error('Manifest verification FAILED');
        result.reasons.forEach((reason) => console.error(`- ${reason}`));
        process.exitCode = 1;
        return;
    }
    console.log('Manifest verification succeeded');
});
program.parse(process.argv);
