#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const create_js_1 = require("./commands/create.js");
const build_js_1 = require("./commands/build.js");
const test_js_1 = require("./commands/test.js");
const publish_js_1 = require("./commands/publish.js");
const validate_js_1 = require("./commands/validate.js");
const program = new commander_1.Command();
program
    .name('summit-plugin')
    .description('CLI tool for Summit plugin development')
    .version('1.0.0');
// Create command
program
    .command('create <plugin-name>')
    .description('Create a new plugin from template')
    .option('-c, --category <category>', 'Plugin category')
    .option('-a, --author <author>', 'Plugin author name')
    .option('-t, --template <template>', 'Template to use', 'default')
    .action(create_js_1.createPlugin);
// Build command
program
    .command('build')
    .description('Build the plugin')
    .option('-w, --watch', 'Watch mode')
    .action(build_js_1.buildPlugin);
// Test command
program
    .command('test')
    .description('Run plugin tests')
    .option('-c, --coverage', 'Generate coverage report')
    .action(test_js_1.testPlugin);
// Validate command
program
    .command('validate')
    .description('Validate plugin manifest and code')
    .action(validate_js_1.validatePlugin);
// Publish command
program
    .command('publish')
    .description('Publish plugin to marketplace')
    .option('-r, --registry <url>', 'Registry URL')
    .option('--dry-run', 'Dry run without publishing')
    .action(publish_js_1.publishPlugin);
program.parse();
