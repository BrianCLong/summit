import ts from 'typescript';
import { sha256 } from './utils/canonical.js';
import type { AnalysisIssue, StaticAnalysisResult, UdfSubmission } from './types.js';

const POLICY_VERSION = 'sum-static-analysis-v1';

const bannedGlobals = new Set(['eval', 'Function', 'process', 'require', 'WebAssembly']);
const bannedModules = new Set(['fs', 'child_process', 'vm', 'worker_threads', 'http', 'https', 'net', 'dgram']);
const sensitiveSinks = new Set(['exec', 'execSync', 'spawn', 'spawnSync', 'eval', 'Function']);
const taintSources = new Set(['input', 'userInput', 'payload', 'event', 'args']);

type TaintState = {
  tainted: Set<string>;
  paths: Set<string>;
};

export function performStaticAnalysis(submission: UdfSubmission): StaticAnalysisResult {
  const sourceFile = ts.createSourceFile('submission.ts', submission.code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const issues: AnalysisIssue[] = [];
  const taintState: TaintState = { tainted: new Set<string>(), paths: new Set<string>() };

  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) {
      if (bannedGlobals.has(node.text)) {
        issues.push(issue(node, `Usage of global '${node.text}' is not permitted`, 'banned-global'));
      }

      if (taintSources.has(node.text)) {
        taintState.tainted.add(node.text);
      }
    }

    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : undefined;
      if (moduleSpecifier && bannedModules.has(moduleSpecifier)) {
        issues.push(issue(node, `Importing module '${moduleSpecifier}' is forbidden`, 'banned-module'));
      }
    }

    if (ts.isCallExpression(node)) {
      const calleeName = extractCalleeName(node.expression);
      if (calleeName && bannedModules.has(calleeName)) {
        issues.push(issue(node.expression, `Dynamic require for '${calleeName}' is forbidden`, 'banned-dynamic-import'));
      }

      if (calleeName === 'require') {
        const [firstArg] = node.arguments;
        if (firstArg && ts.isStringLiteral(firstArg) && bannedModules.has(firstArg.text)) {
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

    if (ts.isPropertyAccessExpression(node)) {
      const fullName = serializeNode(node);
      if (/process\.|globalThis\.process/.test(fullName)) {
        issues.push(issue(node, `Access to '${fullName}' is not allowed`, 'process-access'));
      }
    }

    ts.forEachChild(node, visit);
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

function issue(node: ts.Node, message: string, rule: string, severity: 'error' | 'warning' = 'error'): AnalysisIssue {
  const { line, character } = ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart());
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

function extractCalleeName(expr: ts.Expression): string | undefined {
  if (ts.isIdentifier(expr)) {
    return expr.text;
  }

  if (ts.isPropertyAccessExpression(expr)) {
    return expr.name.text;
  }

  return undefined;
}

function containsTaintedIdentifier(node: ts.Node, tainted: Set<string>): boolean {
  let found = false;
  const search = (child: ts.Node): void => {
    if (found) {
      return;
    }
    if (ts.isIdentifier(child) && tainted.has(child.text)) {
      found = true;
      return;
    }
    ts.forEachChild(child, search);
  };
  search(node);
  return found;
}

function normalizeIssues(issues: AnalysisIssue[]): AnalysisIssue[] {
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

export function hashSubmission(submission: UdfSubmission): string {
  return sha256(`${submission.tenantId}:${submission.code}`);
}

function serializeNode(node: ts.Node): string {
  return node.getText();
}
