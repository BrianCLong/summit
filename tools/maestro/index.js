#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const promises_1 = require("fs/promises");
const yaml_1 = __importDefault(require("yaml"));
const backfill_js_1 = require("../../server/src/conductor/backfill.js");
commander_1.program.command('validate <file>').action(async (f) => {
    const y = await (0, promises_1.readFile)(f, 'utf8');
    try {
        yaml_1.default.parse(y);
        console.log('ok');
    }
    catch (e) {
        console.error('invalid yaml', e.message);
        process.exitCode = 1;
    }
});
commander_1.program.command('simulate <file>').action(async (f) => {
    const y = await (0, promises_1.readFile)(f, 'utf8');
    const rb = yaml_1.default.parse(y);
    console.log(Object.keys(rb?.graph || {}));
});
commander_1.program
    .command('backfill <file>')
    .option('--dry', 'dry run')
    .action(async (f, opts) => {
    const y = await (0, promises_1.readFile)(f, 'utf8');
    if (opts.dry)
        console.table(await (0, backfill_js_1.planBackfill)(y));
    else
        console.table(await (0, backfill_js_1.runBackfill)(y, true));
});
commander_1.program.parse();
