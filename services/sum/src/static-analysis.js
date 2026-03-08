"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performStaticAnalysis = performStaticAnalysis;
exports.hashSubmission = hashSubmission;
const typescript_1 = __importDefault(require("typescript"));
const canonical_js_1 = require("./utils/canonical.js");
const POLICY_VERSION = 'sum-static-analysis-v1';
const bannedGlobals = new Set(['eval', 'Function', 'process', 'require', 'WebAssembly']);
const bannedModules = new Set(['fs', 'child_process', 'vm', 'worker_threads', 'http', 'https', 'net', 'dgram']);
const sensitiveSinks = new Set(['exec', 'execSync', 'spawn', 'spawnSync', 'eval', 'Function']);
const taintSources = new Set(['input', 'userInput', 'payload', 'event', 'args']);
function performStaticAnalysis(submission) {
    const sourceFile = typescript_1.default.createSourceFile('submission.ts', submission.code, typescript_1.default.ScriptTarget.ES2022, true, typescript_1.default.ScriptKind.TS);
    const issues = [];
    const taintState = { tainted: new Set(), paths: new Set() };
    const visit = (node) => {
        if (typescript_1.default.isIdentifier(node)) {
            if (bannedGlobals.has(node.text)) {
                issues.push(issue(node, `Usage of global '${node.text}' is not permitted`, 'banned-global'));
            }
            if (taintSources.has(node.text)) {
                taintState.tainted.add(node.text);
            }
        }
        if (typescript_1.default.isImportDeclaration(node) || typescript_1.default.isExportDeclaration(node)) {
            const moduleSpecifier = node.moduleSpecifier && typescript_1.default.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : undefined;
            if (moduleSpecifier && bannedModules.has(moduleSpecifier)) {
                issues.push(issue(node, `Importing module '${moduleSpecifier}' is forbidden`, 'banned-module'));
            }
        }
        if (typescript_1.default.isCallExpression(node)) {
            const calleeName = extractCalleeName(node.expression);
            if (calleeName && bannedModules.has(calleeName)) {
                issues.push(issue(node.expression, `Dynamic require for '${calleeName}' is forbidden`, 'banned-dynamic-import'));
            }
            if (calleeName === 'require') {
                const [firstArg] = node.arguments;
                if (firstArg && typescript_1.default.isStringLiteral(firstArg) && bannedModules.has(firstArg.text)) {
                    issues.push(issue(firstArg, `Requiring module '${firstArg.text}' is forbidden`, 'banned-module'));
                }
            }
            if (calleeName && sensitiveSinks.has(calleeName)) {
                const taintedArg = node.arguments.find((arg) => containsTaintedIdentifier(arg, taintState.tainted));
                if (taintedArg) {
                    taintState.paths.add(`${calleeName}(${serializeNode(taintedArg)})`);
                    issues.push(issue(node, `Tainted value flows into sensitive sink '${calleeName}'`, 'taint-sink', 'error'));
                }
            }
        }
        if (typescript_1.default.isPropertyAccessExpression(node)) {
            const fullName = serializeNode(node);
            if (/process\.|globalThis\.process/.test(fullName)) {
                issues.push(issue(node, `Access to '${fullName}' is not allowed`, 'process-access'));
            }
        }
        typescript_1.default.forEachChild(node, visit);
    };
    visit(sourceFile);
    const passed = issues.filter((i) => i.severity === 'error').length === 0;
    return {
        passed,
        issues: normalizeIssues(issues),
        taintPaths: Array.from(taintState.paths).sort(),
        policyVersion: POLICY_VERSION,
    };
}
function issue(node, message, rule, severity = 'error') {
    const { line, character } = typescript_1.default.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart());
    return {
        message,
        rule,
        severity,
        location: {
            line: line + 1,
            column: character + 1,
        },
    };
}
function extractCalleeName(expr) {
    if (typescript_1.default.isIdentifier(expr)) {
        return expr.text;
    }
    if (typescript_1.default.isPropertyAccessExpression(expr)) {
        return expr.name.text;
    }
    return undefined;
}
function containsTaintedIdentifier(node, tainted) {
    let found = false;
    const search = (child) => {
        if (found) {
            return;
        }
        if (typescript_1.default.isIdentifier(child) && tainted.has(child.text)) {
            found = true;
            return;
        }
        typescript_1.default.forEachChild(child, search);
    };
    search(node);
    return found;
}
function normalizeIssues(issues) {
    return issues
        .map((i) => ({
        ...i,
        message: i.message.trim(),
        rule: i.rule,
        severity: i.severity,
    }))
        .sort((a, b) => {
        if (a.severity !== b.severity) {
            return a.severity === 'error' ? -1 : 1;
        }
        if (a.rule !== b.rule) {
            return a.rule.localeCompare(b.rule);
        }
        return a.message.localeCompare(b.message);
    });
}
function hashSubmission(submission) {
    return (0, canonical_js_1.sha256)(`${submission.tenantId}:${submission.code}`);
}
function serializeNode(node) {
    return node.getText();
}
