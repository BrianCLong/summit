#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs_1 = require("fs");
const validate_js_1 = require("./validate.js");
const store_js_1 = require("./store.js");
const evidence_js_1 = require("./evidence.js");
const policy_js_1 = require("./policy.js");
const program = new commander_1.Command();
program
    .name('summit-agent-trace')
    .description('CLI for managing Agent Trace records')
    .version('0.1.0');
program
    .command('validate')
    .description('Validate a trace record file')
    .argument('<path>', 'Path to the trace record JSON file')
    .action((path) => {
    try {
        const record = JSON.parse((0, fs_1.readFileSync)(path, 'utf8'));
        const result = (0, validate_js_1.validateTraceRecord)(record);
        if (result.valid) {
            console.log('✅ Record is valid');
        }
        else {
            console.error('❌ Record is invalid:');
            result.errors?.forEach(err => console.error(`  - ${err}`));
            process.exit(1);
        }
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
});
program
    .command('summarize')
    .description('Summarize traces for a revision and emit evidence')
    .argument('<revision>', 'VCS revision to summarize')
    .option('--base-dir <path>', 'Base directory for evidence', process.cwd())
    .action((revision, options) => {
    const store = new store_js_1.TraceStore(options.baseDir);
    const records = store.loadRecords(revision);
    if (records.length === 0) {
        console.warn(`No records found for revision ${revision}`);
    }
    const items = records.map(r => {
        const validation = (0, validate_js_1.validateTraceRecord)(r);
        return {
            evidence_id: `EVD-AGENTTRACE-RECORD-${r.id}`,
            summary: `Trace record for ${r.id}`,
            artifacts: [`.summit/agent-trace/records/${revision}/${r.id}.json`],
            results: [{ id: r.id, valid: validation.valid, errors: validation.errors }]
        };
    });
    const metrics = {
        trace_records_count: records.length,
        files_covered_count: new Set(records.flatMap(r => r.files.map(f => f.path))).size
    };
    (0, evidence_js_1.emitEvidence)(options.baseDir, items, metrics);
    console.log(`Summarized ${records.length} records for revision ${revision}`);
});
program
    .command('check-policy')
    .description('Check if changed files are covered by trace records')
    .argument('<revision>', 'VCS revision to check')
    .option('--changed-files <files>', 'Comma-separated list of changed files')
    .option('--base-dir <path>', 'Base directory for repo', process.cwd())
    .option('--strict', 'Fail if any file is missing coverage', false)
    .action((revision, options) => {
    const store = new store_js_1.TraceStore(options.baseDir);
    const records = store.loadRecords(revision);
    const changedFiles = options.changedFiles ? options.changedFiles.split(',') : [];
    const result = (0, policy_js_1.checkCoverage)(changedFiles, records);
    if (result.covered) {
        console.log('✅ All changed files are covered by trace records');
    }
    else {
        console.error('❌ Missing trace coverage for files:');
        result.missingFiles.forEach(f => console.error(`  - ${f}`));
        if (options.strict) {
            process.exit(1);
        }
    }
});
program.parse();
