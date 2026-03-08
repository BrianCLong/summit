"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const node_module_1 = require("node:module");
const require = (0, node_module_1.createRequire)(import.meta.url);
(0, globals_1.describe)('findConsoleLogViolations', () => {
    (0, globals_1.test)('flags console.log calls on added lines', () => {
        const { findConsoleLogViolations, } = require('../../../scripts/ci/console-log-scan.cjs');
        const source = [
            'const value = 42;',
            'console.log("debug", value);',
            'return value;',
        ].join('\n');
        const added = new Set([2]);
        const violations = findConsoleLogViolations(source, added);
        (0, globals_1.expect)(violations).toEqual([
            {
                line: 2,
                code: 'console.log("debug", value);',
            },
        ]);
    });
    (0, globals_1.test)('ignores console.log calls outside the diff', () => {
        const { findConsoleLogViolations, } = require('../../../scripts/ci/console-log-scan.cjs');
        const source = [
            'console.log("existing");',
            'console.log("still existing");',
        ].join('\n');
        const added = new Set([3]);
        const violations = findConsoleLogViolations(source, added);
        (0, globals_1.expect)(violations).toHaveLength(0);
    });
});
