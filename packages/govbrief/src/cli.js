#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const pipeline_js_1 = require("./pipeline.js");
const program = new commander_1.Command();
program
    .name('govbrief')
    .description('Ingest .gov research and generate proof-carrying strategy briefs');
program
    .command('fetch')
    .argument('<url>', 'URL of the .gov article to ingest')
    .option('-o, --output <dir>', 'Directory for artifacts', 'artifacts')
    .action(async (url, options) => {
    try {
        const result = await (0, pipeline_js_1.runFetch)(url, options.output);
        console.log(`Artifacts written to ${result.artifactDir}`);
    }
    catch (error) {
        console.error(`Fetch failed: ${error.message}`);
        process.exitCode = 1;
    }
});
program
    .command('brief')
    .argument('<artifactDir>', 'Directory produced by the fetch command')
    .action(async (artifactDir) => {
    try {
        const brief = await (0, pipeline_js_1.runBrief)(artifactDir);
        console.log(`Brief generated at ${artifactDir}/brief.md`);
        console.log('---');
        console.log(brief);
    }
    catch (error) {
        console.error(`Brief generation failed: ${error.message}`);
        process.exitCode = 1;
    }
});
program.parseAsync().catch((error) => {
    console.error(error);
    process.exit(1);
});
