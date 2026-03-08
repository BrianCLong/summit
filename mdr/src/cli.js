#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const process_1 = __importDefault(require("process"));
const registry_1 = require("./registry");
function usage() {
    process_1.default.stderr.write(`Usage:
  mdr compile <dialect> [--metric <name>] [--specs <path>] [--out <path>]
  mdr diff <metric> <leftVersion> <rightVersion> [--specs <path>]
  mdr test <dialect> [--metric <name>] [--specs <path>] [--golden <path>]
  mdr golden <dialect> [--metric <name>] [--specs <path>] [--golden <path>]
`);
    process_1.default.exit(1);
}
function parseFlags(args) {
    const flags = {};
    for (let i = 0; i < args.length; i++) {
        const token = args[i];
        if (token.startsWith('--')) {
            const key = token.slice(2);
            const value = args[i + 1];
            if (!value || value.startsWith('--')) {
                throw new Error(`Flag ${token} requires a value.`);
            }
            flags[key] = value;
            i++;
        }
    }
    return flags;
}
function resolveRegistry(flags) {
    return new registry_1.MetricRegistry({
        specsRoot: flags.specs ? path_1.default.resolve(flags.specs) : undefined,
        outputRoot: flags.out ? path_1.default.resolve(flags.out) : undefined,
        goldenRoot: flags.golden ? path_1.default.resolve(flags.golden) : undefined
    });
}
function asDialect(value) {
    if (value === 'bigquery' || value === 'snowflake' || value === 'postgres') {
        return value;
    }
    throw new Error(`Unsupported dialect ${value ?? '<missing>'}`);
}
function main() {
    const [command, ...rest] = process_1.default.argv.slice(2);
    if (!command) {
        usage();
    }
    try {
        if (command === 'compile') {
            const dialect = asDialect(rest[0]);
            const flags = parseFlags(rest.slice(1));
            const registry = resolveRegistry(flags);
            const written = registry.writeCompiledArtifacts(dialect, flags.metric);
            if (written.length === 0) {
                process_1.default.stdout.write('No artifacts changed.\n');
            }
            else {
                process_1.default.stdout.write('Wrote artifacts:\n');
                for (const file of written) {
                    process_1.default.stdout.write(`  ${file}\n`);
                }
            }
            return;
        }
        if (command === 'diff') {
            const [metricName, left, right, ...flagArgs] = rest;
            if (!metricName || !left || !right) {
                usage();
            }
            const flags = parseFlags(flagArgs ?? []);
            const registry = resolveRegistry(flags);
            const diff = registry.diff(metricName, Number(left), Number(right));
            process_1.default.stdout.write(`${diff}\n`);
            return;
        }
        if (command === 'test') {
            const dialect = asDialect(rest[0]);
            const flags = parseFlags(rest.slice(1));
            const registry = resolveRegistry(flags);
            const failures = registry.runConformance(dialect, flags.metric);
            if (failures.length > 0) {
                process_1.default.stderr.write('Conformance failures detected:\n');
                for (const failure of failures) {
                    process_1.default.stderr.write(`- ${failure}\n`);
                }
                process_1.default.exitCode = 1;
            }
            else {
                process_1.default.stdout.write('All compiled SQL artifacts match golden outputs.\n');
            }
            return;
        }
        if (command === 'golden') {
            const dialect = asDialect(rest[0]);
            const flags = parseFlags(rest.slice(1));
            const registry = resolveRegistry(flags);
            const written = registry.exportGoldenFixtures(dialect, flags.metric);
            process_1.default.stdout.write('Exported golden fixtures:\n');
            for (const file of written) {
                process_1.default.stdout.write(`  ${file}\n`);
            }
            return;
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process_1.default.stderr.write(`${message}\n`);
        process_1.default.exitCode = 1;
        return;
    }
    usage();
}
main();
