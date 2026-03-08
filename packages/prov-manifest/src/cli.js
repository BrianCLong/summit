#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const verify_js_1 = require("./verify.js");
const generate_js_1 = require("./generate.js");
const path_1 = __importDefault(require("path"));
const program = new commander_1.Command();
program
    .command('verify <manifestPath> <exportDir>')
    .description('Verify the integrity of an export manifest and its associated files.')
    .action(async (manifestPath, exportDir) => {
    const result = await (0, verify_js_1.verifyManifest)(path_1.default.resolve(manifestPath), path_1.default.resolve(exportDir));
    if (result.success) {
        console.log('Manifest verification successful!');
        process.exit(0);
    }
    else {
        console.error('Manifest verification failed:');
        result.errors.forEach((error) => console.error(`- ${error}`));
        process.exit(1);
    }
});
program
    .command('generate <exportDir>')
    .description('Generate a manifest for the given directory.')
    .option('--metadata <json>', 'Metadata to include in the manifest, as a JSON string.')
    .option('--lineage <json>', 'Lineage data to include in the manifest, as a JSON string.')
    .action(async (exportDir, options) => {
    try {
        const metadata = options.metadata ? JSON.parse(options.metadata) : {};
        const lineage = options.lineage ? JSON.parse(options.lineage) : [];
        const manifest = await (0, generate_js_1.generateManifest)(path_1.default.resolve(exportDir), { metadata, lineage });
        console.log('Manifest generated successfully at', path_1.default.join(exportDir, 'manifest.json'));
        console.log(JSON.stringify(manifest, null, 2));
        process.exit(0);
    }
    catch (error) {
        console.error('Failed to generate manifest:', error);
        process.exit(1);
    }
});
program.parse(process.argv);
